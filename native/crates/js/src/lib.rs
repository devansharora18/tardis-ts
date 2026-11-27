// Embedded QuickJS host.
//
// The bundle is evaluated once. Two globals bridge the runtime:
// `__tardis_ts_flush(json)` for scene patches and `__tardis_ts_event(json)` for
// input. The engine lives on the same thread behind a RefCell; QuickJS is
// single-threaded here by design.

use std::cell::RefCell;
use std::collections::HashMap;
use std::path::PathBuf;
use std::rc::Rc;

use rquickjs::{Context, Function, Runtime};
use tardis_ts_core::Engine;

pub struct JsHost {
    // Context must drop before the runtime it points into.
    context: Context,
    runtime: Runtime,
    engine: Rc<RefCell<Engine>>,
}

impl JsHost {
    pub fn new(width: u32, height: u32, bundle: &str) -> Result<Self, String> {
        let runtime = Runtime::new().map_err(|err| format!("quickjs runtime: {err}"))?;
        let context = Context::full(&runtime).map_err(|err| format!("quickjs context: {err}"))?;
        let engine = Rc::new(RefCell::new(Engine::new(width as f32, height as f32)));

        let storage = Rc::new(RefCell::new(load_storage()));

        context.with(|ctx| -> Result<(), String> {
            let globals = ctx.globals();

            let log = Function::new(ctx.clone(), |message: String| {
                eprintln!("[js] {message}");
            })
            .map_err(|err| format!("host log: {err}"))?;
            globals
                .set("__tardis_ts_log", log)
                .map_err(|err| format!("install log: {err}"))?;

            let flush_engine = engine.clone();
            let flush = Function::new(ctx.clone(), move |json: String| match flush_engine.try_borrow_mut() {
                Ok(mut engine) => {
                    if let Err(err) = engine.apply_json(&json) {
                        eprintln!("tardis-ts: patch rejected: {err}");
                    }
                }
                Err(_) => eprintln!("tardis-ts: patch re-entered the engine"),
            })
            .map_err(|err| format!("host flush: {err}"))?;
            globals
                .set("__tardis_ts_flush", flush)
                .map_err(|err| format!("install flush: {err}"))?;

            // Clipboard bridge. arboard returns None without a display, in
            // which case the JS runtime keeps its in-memory fallback.
            let clipboard = Rc::new(RefCell::new(arboard::Clipboard::new().ok()));
            let read_clipboard = clipboard.clone();
            let clipboard_read = Function::new(ctx.clone(), move || -> String {
                read_clipboard
                    .borrow_mut()
                    .as_mut()
                    .and_then(|clipboard| clipboard.get_text().ok())
                    .unwrap_or_default()
            })
            .map_err(|err| format!("host clipboard read: {err}"))?;
            globals
                .set("__tardis_ts_clipboard_read", clipboard_read)
                .map_err(|err| format!("install clipboard read: {err}"))?;

            let write_clipboard = clipboard.clone();
            let clipboard_write = Function::new(ctx.clone(), move |text: String| {
                if let Some(clipboard) = write_clipboard.borrow_mut().as_mut() {
                    let _ = clipboard.set_text(text);
                }
            })
            .map_err(|err| format!("host clipboard write: {err}"))?;
            globals
                .set("__tardis_ts_clipboard_write", clipboard_write)
                .map_err(|err| format!("install clipboard write: {err}"))?;

            let read_storage = storage.clone();
            let storage_get = Function::new(ctx.clone(), move |key: String| -> Option<String> {
                read_storage.borrow().get(&key).cloned()
            })
            .map_err(|err| format!("host storage get: {err}"))?;
            globals
                .set("__tardis_ts_storage_get", storage_get)
                .map_err(|err| format!("install storage get: {err}"))?;

            let write_storage = storage.clone();
            let storage_set = Function::new(ctx.clone(), move |key: String, value: String| {
                write_storage.borrow_mut().insert(key, value);
                save_storage(&write_storage.borrow());
            })
            .map_err(|err| format!("host storage set: {err}"))?;
            globals
                .set("__tardis_ts_storage_set", storage_set)
                .map_err(|err| format!("install storage set: {err}"))?;

            let remove_storage = storage.clone();
            let storage_remove = Function::new(ctx.clone(), move |key: String| {
                remove_storage.borrow_mut().remove(&key);
                save_storage(&remove_storage.borrow());
            })
            .map_err(|err| format!("host storage remove: {err}"))?;
            globals
                .set("__tardis_ts_storage_remove", storage_remove)
                .map_err(|err| format!("install storage remove: {err}"))?;

            let http = Function::new(
                ctx.clone(),
                move |method: String, url: String, headers: String, body: String| -> String {
                    http_request(&method, &url, &headers, &body)
                },
            )
            .map_err(|err| format!("host http: {err}"))?;
            globals
                .set("__tardis_ts_http", http)
                .map_err(|err| format!("install http: {err}"))?;

            ctx.eval::<(), _>(
                "globalThis.console = {\
                   log: function(){ __tardis_ts_log(Array.prototype.slice.call(arguments).map(String).join(' ')); },\
                   warn: function(){ __tardis_ts_log(Array.prototype.slice.call(arguments).map(String).join(' ')); },\
                   error: function(){ __tardis_ts_log(Array.prototype.slice.call(arguments).map(String).join(' ')); }\
                 };",
            )
            .map_err(|err| format!("console shim: {err}"))?;

            ctx.eval::<(), _>(
                r#"(function(){
                  if (!globalThis.localStorage) {
                    var api = {
                      getItem: function(key){ var value = __tardis_ts_storage_get(String(key)); return value === null || value === undefined ? null : value; },
                      setItem: function(key, value){ __tardis_ts_storage_set(String(key), String(value)); },
                      removeItem: function(key){ __tardis_ts_storage_remove(String(key)); },
                      clear: function(){ throw new Error('localStorage.clear is not supported'); }
                    };
                    Object.defineProperty(globalThis, 'localStorage', { value: api, configurable: true });
                  }
                  if (!globalThis.fetch) {
                    globalThis.fetch = function(input, init){
                      return new Promise(function(resolve, reject){
                        try {
                          init = init || {};
                          var headers = init.headers || {};
                          var body = init.body == null ? '' : String(init.body);
                          var raw = __tardis_ts_http(String(init.method || 'GET'), String(input), JSON.stringify(headers), body);
                          var result = JSON.parse(raw);
                          if (result.error) { reject(new Error(result.error)); return; }
                          resolve({
                            ok: result.status >= 200 && result.status < 300,
                            status: result.status,
                            statusText: '',
                            url: String(input),
                            headers: { get: function(){ return null; } },
                            text: function(){ return Promise.resolve(result.body); },
                            json: function(){ return Promise.resolve(JSON.parse(result.body)); }
                          });
                        } catch (err) { reject(err); }
                      });
                    };
                  }
                })();"#,
            )
            .map_err(|err| format!("web api shim: {err}"))?;

            ctx.eval::<(), _>(bundle)
                .map_err(|err| format!("js eval: {err}"))?;
            while ctx.execute_pending_job() {}
            Ok(())
        })?;

        Ok(Self {
            context,
            runtime,
            engine,
        })
    }

    pub fn engine(&self) -> Rc<RefCell<Engine>> {
        self.engine.clone()
    }

    pub fn dispatch(&self, event_json: &str) -> Result<(), String> {
        self.context.with(|ctx| {
            let globals = ctx.globals();
            let handler: Function = globals
                .get("__tardis_ts_event")
                .map_err(|err| format!("event hook: {err}"))?;
            handler
                .call::<_, ()>((event_json.to_string(),))
                .map_err(|err| format!("event dispatch: {err}"))?;
            while ctx.execute_pending_job() {}
            Ok(())
        })
    }

    pub fn eval(&self, source: &str) -> Result<(), String> {
        self.context.with(|ctx| {
            ctx.eval::<(), _>(source)
                .map_err(|err| format!("js eval: {err}"))?;
            while ctx.execute_pending_job() {}
            Ok(())
        })
    }

    pub fn runtime(&self) -> &Runtime {
        &self.runtime
    }
}

fn storage_path() -> PathBuf {
    if let Ok(dir) = std::env::var("TARDIS_TS_STORAGE_DIR") {
        return PathBuf::from(dir).join("storage.json");
    }
    let app = std::env::current_dir()
        .ok()
        .and_then(|path| {
            path.file_name()
                .map(|name| name.to_string_lossy().into_owned())
        })
        .unwrap_or_else(|| "tardis-ts-app".to_string());
    let base = if cfg!(target_os = "windows") {
        std::env::var("APPDATA")
            .map(PathBuf::from)
            .unwrap_or_else(|_| std::env::temp_dir())
    } else if cfg!(target_os = "macos") {
        std::env::var("HOME")
            .map(|home| PathBuf::from(home).join("Library/Application Support"))
            .unwrap_or_else(|_| std::env::temp_dir())
    } else {
        std::env::var("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|_| std::env::var("HOME").map(|home| PathBuf::from(home).join(".local/share")))
            .unwrap_or_else(|_| std::env::temp_dir())
    };
    base.join("tardis-ts").join(app).join("storage.json")
}

fn load_storage() -> HashMap<String, String> {
    std::fs::read_to_string(storage_path())
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save_storage(values: &HashMap<String, String>) {
    let path = storage_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(values) {
        let temp = path.with_extension("json.tmp");
        if std::fs::write(&temp, text).is_ok() {
            let _ = std::fs::rename(temp, path);
        }
    }
}

fn http_request(method: &str, url: &str, headers: &str, body: &str) -> String {
    let headers: HashMap<String, String> = serde_json::from_str(headers).unwrap_or_default();
    let agent = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(20))
        .build();
    let mut request = agent.request(method, url);
    for (key, value) in headers {
        request = request.set(&key, &value);
    }
    let result = if body.is_empty() {
        request.call()
    } else {
        request.send_string(body)
    };
    match result {
        Ok(response) => {
            let status = response.status();
            let body = response.into_string().unwrap_or_default();
            serde_json::json!({ "status": status, "body": body }).to_string()
        }
        Err(ureq::Error::Status(status, response)) => {
            let body = response.into_string().unwrap_or_default();
            serde_json::json!({ "status": status, "body": body }).to_string()
        }
        Err(err) => serde_json::json!({ "status": 0, "error": err.to_string() }).to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;

    #[test]
    fn storage_round_trips_through_json() {
        let dir = tempfile::tempdir().unwrap();
        std::env::set_var("TARDIS_TS_STORAGE_DIR", dir.path());
        let mut values = HashMap::new();
        values.insert("theme".to_string(), "dark".to_string());
        save_storage(&values);
        assert_eq!(
            load_storage().get("theme").map(String::as_str),
            Some("dark")
        );
        std::env::remove_var("TARDIS_TS_STORAGE_DIR");
    }

    #[test]
    fn http_request_reads_a_local_response() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0u8; 512];
            let _ = stream.read(&mut buffer);
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 7\r\n\r\nhealthy")
                .unwrap();
        });
        let response = http_request("GET", &format!("http://{address}/"), "{}", "");
        server.join().unwrap();
        let value: serde_json::Value = serde_json::from_str(&response).unwrap();
        assert_eq!(value["status"], 200);
        assert_eq!(value["body"], "healthy");
    }
    #[test]
    fn fetch_shim_resolves_through_the_job_queue() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0u8; 512];
            let _ = stream.read(&mut buffer);
            stream
                .write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 7\r\n\r\nhealthy")
                .unwrap();
        });
        let bundle = format!(
            "fetch('http://{address}/').then(function(r){{ return r.text(); }}).then(function(text){{ globalThis.__fetch_result = text; }});"
        );
        let host = JsHost::new(10, 10, &bundle).unwrap();
        let check = host
            .eval("if (globalThis.__fetch_result !== 'healthy') throw new Error('fetch failed')");
        server.join().unwrap();
        assert!(check.is_ok(), "{check:?}");
    }
}
