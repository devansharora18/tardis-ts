// Embedded QuickJS host.
//
// The bundle is evaluated once. Two globals bridge the runtime:
// `__tardis_flush(json)` for scene patches and `__tardis_event(json)` for
// input. The engine lives on the same thread behind a RefCell; QuickJS is
// single-threaded here by design.

use std::cell::RefCell;
use std::rc::Rc;

use rquickjs::{Context, Function, Runtime};
use tardis_core::Engine;

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

        context.with(|ctx| -> Result<(), String> {
            let globals = ctx.globals();

            let log = Function::new(ctx.clone(), |message: String| {
                eprintln!("[js] {message}");
            })
            .map_err(|err| format!("host log: {err}"))?;
            globals
                .set("__tardis_log", log)
                .map_err(|err| format!("install log: {err}"))?;

            let flush_engine = engine.clone();
            let flush = Function::new(ctx.clone(), move |json: String| match flush_engine.try_borrow_mut() {
                Ok(mut engine) => {
                    if let Err(err) = engine.apply_json(&json) {
                        eprintln!("tardis: patch rejected: {err}");
                    }
                }
                Err(_) => eprintln!("tardis: patch re-entered the engine"),
            })
            .map_err(|err| format!("host flush: {err}"))?;
            globals
                .set("__tardis_flush", flush)
                .map_err(|err| format!("install flush: {err}"))?;

            ctx.eval::<(), _>(
                "globalThis.console = {\
                   log: function(){ __tardis_log(Array.prototype.slice.call(arguments).map(String).join(' ')); },\
                   warn: function(){ __tardis_log(Array.prototype.slice.call(arguments).map(String).join(' ')); },\
                   error: function(){ __tardis_log(Array.prototype.slice.call(arguments).map(String).join(' ')); }\
                 };",
            )
            .map_err(|err| format!("console shim: {err}"))?;

            ctx.eval::<(), _>(bundle)
                .map_err(|err| format!("js eval: {err}"))?;
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
                .get("__tardis_event")
                .map_err(|err| format!("event hook: {err}"))?;
            handler
                .call::<_, ()>((event_json.to_string(),))
                .map_err(|err| format!("event dispatch: {err}"))
        })
    }

    pub fn eval(&self, source: &str) -> Result<(), String> {
        self.context.with(|ctx| {
            ctx.eval::<(), _>(source)
                .map_err(|err| format!("js eval: {err}"))
        })
    }

    pub fn runtime(&self) -> &Runtime {
        &self.runtime
    }
}
