// Native runtime binary: headless frame rendering and a desktop window.

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use tardis_js::JsHost;

#[cfg(feature = "window")]
mod a11y;
#[cfg(all(feature = "window", feature = "wgpu"))]
mod gpu;

struct Args {
    bundle: PathBuf,
    width: u32,
    height: u32,
    scale: f32,
    backend: String,
    headless: bool,
    out: Option<PathBuf>,
    dump: Option<PathBuf>,
    click: Option<(f32, f32)>,
    wheel: Option<(f32, f32, f32)>,
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("tardis-native: {err}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), String> {
    let args = parse_args()?;
    let bundle = fs::read_to_string(&args.bundle)
        .map_err(|err| format!("read {}: {err}", args.bundle.display()))?;
    let host = JsHost::new(args.width, args.height, &bundle)?;

    if args.headless {
        if let Some((x, y)) = args.click {
            let node = host
                .engine()
                .borrow()
                .hit_test(x, y)
                .map(|id| id.to_string())
                .unwrap_or_else(|| "null".to_string());
            let down =
                format!(r#"{{"type":"pointer","phase":"down","x":{x},"y":{y},"node":{node}}}"#);
            let up = format!(r#"{{"type":"pointer","phase":"up","x":{x},"y":{y},"node":{node}}}"#);
            host.dispatch(&down)?;
            host.dispatch(&up)?;
        }
        if let Some((x, y, dy)) = args.wheel {
            let node = host
                .engine()
                .borrow()
                .hit_test(x, y)
                .map(|id| id.to_string())
                .unwrap_or_else(|| "null".to_string());
            let event = format!(r#"{{"type":"wheel","dy":{dy},"node":{node}}}"#);
            host.dispatch(&event)?;
        }
        let engine = host.engine();
        let mut engine = engine.borrow_mut();
        engine.set_scale(args.scale);
        if let Some(dump_path) = &args.dump {
            let dump = engine.dump()?;
            let json =
                serde_json::to_string_pretty(&dump).map_err(|err| format!("dump encode: {err}"))?;
            fs::write(dump_path, json)
                .map_err(|err| format!("write {}: {err}", dump_path.display()))?;
        }
        let out = args
            .out
            .clone()
            .unwrap_or_else(|| PathBuf::from("frame.png"));
        let path = out
            .to_str()
            .ok_or_else(|| "output path is not valid UTF-8".to_string())?;
        engine.render_png(path)?;
        println!("wrote {}", out.display());
        return Ok(());
    }

    #[cfg(feature = "window")]
    {
        window::run(host, args.width, args.height, &args.backend)?;
        Ok(())
    }
    #[cfg(not(feature = "window"))]
    {
        let _ = host;
        Err("built without the window feature; pass --headless".to_string())
    }
}

fn parse_args() -> Result<Args, String> {
    let mut args = Args {
        bundle: PathBuf::from("dist/app.js"),
        width: 800,
        height: 600,
        scale: 1.0,
        backend: "softbuffer".to_string(),
        headless: false,
        out: None,
        dump: None,
        click: None,
        wheel: None,
    };
    let mut iter = env::args().skip(1);
    while let Some(arg) = iter.next() {
        match arg.as_str() {
            "--bundle" => {
                args.bundle = PathBuf::from(
                    iter.next()
                        .ok_or_else(|| "--bundle needs a value".to_string())?,
                );
            }
            "--width" => {
                args.width = iter
                    .next()
                    .ok_or_else(|| "--width needs a value".to_string())?
                    .parse()
                    .map_err(|_| "--width must be a number".to_string())?;
            }
            "--height" => {
                args.height = iter
                    .next()
                    .ok_or_else(|| "--height needs a value".to_string())?
                    .parse()
                    .map_err(|_| "--height must be a number".to_string())?;
            }
            "--backend" => {
                let value = iter
                    .next()
                    .ok_or_else(|| "--backend needs a value".to_string())?;
                if value != "softbuffer" && value != "wgpu" {
                    return Err(format!("unknown backend: {value}"));
                }
                #[cfg(not(feature = "wgpu"))]
                if value == "wgpu" {
                    return Err(
                        "this build has no wgpu backend; rebuild with --features wgpu".to_string(),
                    );
                }
                args.backend = value;
            }
            "--scale" => {
                args.scale = iter
                    .next()
                    .ok_or_else(|| "--scale needs a value".to_string())?
                    .parse()
                    .map_err(|_| "--scale must be a number".to_string())?;
                if args.scale <= 0.0 {
                    return Err("--scale must be positive".to_string());
                }
            }
            "--headless" => args.headless = true,
            "--out" => {
                args.out = Some(PathBuf::from(
                    iter.next()
                        .ok_or_else(|| "--out needs a value".to_string())?,
                ));
            }
            "--dump" => {
                args.dump = Some(PathBuf::from(
                    iter.next()
                        .ok_or_else(|| "--dump needs a value".to_string())?,
                ));
            }
            "--click" => {
                let value = iter.next().ok_or_else(|| "--click needs x,y".to_string())?;
                let (x, y) = value
                    .split_once(',')
                    .ok_or_else(|| "--click needs x,y".to_string())?;
                args.click = Some((
                    x.parse()
                        .map_err(|_| "--click x must be a number".to_string())?,
                    y.parse()
                        .map_err(|_| "--click y must be a number".to_string())?,
                ));
            }
            "--wheel" => {
                let value = iter
                    .next()
                    .ok_or_else(|| "--wheel needs x,y,dy".to_string())?;
                let mut parts = value.split(',');
                let x = parts
                    .next()
                    .ok_or_else(|| "--wheel needs x,y,dy".to_string())?
                    .parse()
                    .map_err(|_| "--wheel x must be a number".to_string())?;
                let y = parts
                    .next()
                    .ok_or_else(|| "--wheel needs x,y,dy".to_string())?
                    .parse()
                    .map_err(|_| "--wheel y must be a number".to_string())?;
                let dy = parts
                    .next()
                    .ok_or_else(|| "--wheel needs x,y,dy".to_string())?
                    .parse()
                    .map_err(|_| "--wheel dy must be a number".to_string())?;
                args.wheel = Some((x, y, dy));
            }
            "--help" | "-h" => {
                print_help();
                std::process::exit(0);
            }
            other => return Err(format!("unknown argument: {other}")),
        }
    }
    Ok(args)
}

fn print_help() {
    println!(
        "tardis-native [options]\n\
         \n\
         --bundle <path>   bundled app (default: dist/app.js)\n\
         --width <px>      viewport width (default: 800)\n\
         --height <px>     viewport height (default: 600)\n\
         --scale <factor>  device pixel ratio (default: 1)\n\
         --backend <name>  softbuffer or wgpu (default: softbuffer)\n\
         --headless        render one frame and exit\n\
         --out <path>      PNG output in headless mode (default: frame.png)\n\
         --dump <path>     write the laid-out scene as JSON\n\
         --click <x,y>      dispatch a pointer click before rendering\n\
         --wheel <x,y,dy>   dispatch a wheel event before rendering\n\
         -h, --help        show this help"
    );
}

#[cfg(feature = "window")]
mod window {
    use std::num::NonZeroU32;
    use std::sync::Arc;

    use raw_window_handle::{
        DisplayHandle, HandleError, HasDisplayHandle, HasWindowHandle, WindowHandle,
    };
    use tardis_js::JsHost;
    use winit::event::{
        ElementState, Event, Ime, MouseButton, MouseScrollDelta, TouchPhase, WindowEvent,
    };
    use winit::event_loop::{ControlFlow, EventLoopBuilder};
    use winit::keyboard::{Key, NamedKey};
    use winit::window::WindowBuilder;

    #[derive(Debug)]
    enum UserEvent {
        AccessKit(accesskit_winit::Event),
    }

    impl From<accesskit_winit::Event> for UserEvent {
        fn from(event: accesskit_winit::Event) -> Self {
            Self::AccessKit(event)
        }
    }

    fn update_accessibility(
        adapter: &mut accesskit_winit::Adapter,
        host: &JsHost,
        classes: &mut accesskit::NodeClassSet,
    ) {
        adapter.update_if_active(|| {
            let engine = host.engine();
            let engine = engine.borrow();
            crate::a11y::tree_update(
                &engine.scene,
                engine.layout.as_ref(),
                engine.scale,
                engine.width,
                engine.height,
                classes,
            )
        });
    }

    fn dispatch_action(host: &JsHost, request: &accesskit::ActionRequest) {
        use accesskit::{Action, ActionData};
        let Some(node) = crate::a11y::target_scene_id(request.target) else {
            return;
        };
        let event = match request.action {
            Action::Focus => serde_json::json!({
                "type": "a11y",
                "action": "focus",
                "node": node,
            }),
            Action::Default => serde_json::json!({
                "type": "a11y",
                "action": "default",
                "node": node,
            }),
            Action::SetValue => {
                let Some(ActionData::Value(text)) = &request.data else {
                    return;
                };
                serde_json::json!({
                    "type": "a11y",
                    "action": "set-value",
                    "node": node,
                    "text": text,
                })
            }
            Action::ReplaceSelectedText => {
                let Some(ActionData::Value(text)) = &request.data else {
                    return;
                };
                serde_json::json!({
                    "type": "a11y",
                    "action": "replace-text",
                    "node": node,
                    "text": text,
                })
            }
            _ => return,
        }
        .to_string();
        if let Err(err) = host.dispatch(&event) {
            eprintln!("tardis: a11y action: {err}");
        }
    }

    struct SharedWindow(Arc<winit::window::Window>);

    impl HasDisplayHandle for SharedWindow {
        fn display_handle(&self) -> Result<DisplayHandle<'_>, HandleError> {
            self.0.display_handle()
        }
    }

    impl HasWindowHandle for SharedWindow {
        fn window_handle(&self) -> Result<WindowHandle<'_>, HandleError> {
            self.0.window_handle()
        }
    }

    pub fn run(host: JsHost, width: u32, height: u32, backend: &str) -> Result<(), String> {
        let _ = backend;
        let event_loop = EventLoopBuilder::<UserEvent>::with_user_event()
            .build()
            .map_err(|err| format!("event loop: {err}"))?;
        let window = Arc::new(
            WindowBuilder::new()
                .with_title("Tardis")
                .with_inner_size(winit::dpi::LogicalSize::new(width, height))
                .with_visible(false)
                .build(&event_loop)
                .map_err(|err| format!("window: {err}"))?,
        );
        let proxy = event_loop.create_proxy();
        let mut adapter = accesskit_winit::Adapter::with_event_loop_proxy(&window, proxy);
        let mut classes = accesskit::NodeClassSet::new();
        window.set_visible(true);
        window.set_ime_allowed(true);
        let context = softbuffer::Context::new(SharedWindow(window.clone()))
            .map_err(|err| format!("softbuffer context: {err}"))?;
        let mut surface = softbuffer::Surface::new(&context, SharedWindow(window.clone()))
            .map_err(|err| format!("softbuffer surface: {err}"))?;
        #[cfg(feature = "wgpu")]
        let mut presenter = if backend == "wgpu" {
            match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                crate::gpu::GpuPresenter::new(window.clone())
            })) {
                Ok(Ok(presenter)) => Some(presenter),
                Ok(Err(err)) => {
                    eprintln!("tardis: wgpu unavailable ({err}); using softbuffer");
                    None
                }
                Err(_) => {
                    eprintln!("tardis: wgpu init failed; using softbuffer");
                    None
                }
            }
        } else {
            None
        };
        #[cfg(not(feature = "wgpu"))]
        let _no_wgpu = ();

        let mut cursor = (0.0_f32, 0.0_f32);
        let mut mouse_down = false;
        let mut dirty = true;
        let mut modifiers = winit::keyboard::ModifiersState::empty();
        let mut scale = window.scale_factor();
        {
            let engine = host.engine();
            let mut engine = engine.borrow_mut();
            engine.set_scale(scale as f32);
            let inner = window.inner_size();
            let logical = inner.to_logical::<f32>(scale);
            let _ = engine.resize(logical.width, logical.height);
        }

        event_loop
            .run(move |event, elwt| {
                elwt.set_control_flow(ControlFlow::Wait);
                match event {
                    Event::WindowEvent { event, .. } => {
                        adapter.process_event(&window, &event);
                        match event {
                        WindowEvent::CloseRequested => elwt.exit(),
                        WindowEvent::Resized(size) => {
                            scale = window.scale_factor();
                            let logical = size.to_logical::<f32>(scale);
                            if let Ok(mut engine) = host.engine().try_borrow_mut() {
                                engine.set_scale(scale as f32);
                                let _ = engine.resize(
                                    logical.width.max(1.0),
                                    logical.height.max(1.0),
                                );
                            }
                            #[cfg(feature = "wgpu")]
                            if let Some(presenter) = presenter.as_mut() {
                                presenter.resize(size.width.max(1), size.height.max(1));
                            }
                            dirty = true;
                        }
                        WindowEvent::ScaleFactorChanged { scale_factor, .. } => {
                            scale = scale_factor;
                            let logical = window.inner_size().to_logical::<f32>(scale);
                            if let Ok(mut engine) = host.engine().try_borrow_mut() {
                                engine.set_scale(scale as f32);
                                let _ = engine.resize(
                                    logical.width.max(1.0),
                                    logical.height.max(1.0),
                                );
                            }
                            #[cfg(feature = "wgpu")]
                            if let Some(presenter) = presenter.as_mut() {
                                let size = window.inner_size();
                                presenter.resize(size.width.max(1), size.height.max(1));
                            }
                            dirty = true;
                        }
                        WindowEvent::CursorMoved { position, .. } => {
                            cursor = (
                                (position.x / scale) as f32,
                                (position.y / scale) as f32,
                            );
                            if mouse_down {
                                let node = {
                                    let engine = host.engine();
                                    let hit = engine.borrow().hit_test(cursor.0, cursor.1);
                                    hit.map(|id| id.to_string())
                                        .unwrap_or_else(|| "null".to_string())
                                };
                                let event_json = format!(
                                    r#"{{"type":"pointer","phase":"move","x":{},"y":{},"node":{node}}}"#,
                                    cursor.0, cursor.1
                                );
                                if let Err(err) = host.dispatch(&event_json) {
                                    eprintln!("tardis: {err}");
                                }
                                update_accessibility(&mut adapter, &host, &mut classes);
                                dirty = true;
                            }
                        }
                        WindowEvent::ModifiersChanged(next) => {
                            modifiers = next.state();
                        }
                        WindowEvent::KeyboardInput { event, .. } => {
                            let phase = if event.state == ElementState::Pressed {
                                "down"
                            } else {
                                "up"
                            };
                            let key = match &event.logical_key {
                                Key::Character(value) => value.to_string(),
                                Key::Named(NamedKey::Space) => " ".to_string(),
                                Key::Named(named) => format!("{named:?}"),
                                _ => String::new(),
                            };
                            let event_json = serde_json::json!({
                                "type": "key",
                                "phase": phase,
                                "key": key,
                                "repeat": event.repeat,
                                "mods": {
                                    "ctrl": modifiers.control_key(),
                                    "shift": modifiers.shift_key(),
                                    "alt": modifiers.alt_key(),
                                    "meta": modifiers.super_key(),
                                }
                            })
                            .to_string();
                            if let Err(err) = host.dispatch(&event_json) {
                                eprintln!("tardis: {err}");
                            }
                            dirty = true;
                        }
                        WindowEvent::Ime(ime) => {
                            let event = match ime {
                                Ime::Commit(text) => serde_json::json!({
                                    "type": "text",
                                    "composition": "end",
                                    "text": text,
                                }),
                                Ime::Preedit(text, _) => serde_json::json!({
                                    "type": "text",
                                    "composition": "update",
                                    "text": text,
                                }),
                                Ime::Enabled => serde_json::json!({
                                    "type": "text",
                                    "composition": "start",
                                    "text": "",
                                }),
                                Ime::Disabled => serde_json::json!({
                                    "type": "text",
                                    "composition": "update",
                                    "text": "",
                                }),
                            }
                            .to_string();
                            if let Err(err) = host.dispatch(&event) {
                                eprintln!("tardis: {err}");
                            }
                            update_accessibility(&mut adapter, &host, &mut classes);
                            dirty = true;
                        }
                        WindowEvent::MouseWheel { delta, .. } => {
                            let dy = match delta {
                                MouseScrollDelta::LineDelta(_, y) => -y * 48.0,
                                MouseScrollDelta::PixelDelta(position) => -(position.y as f32),
                            };
                            let node = {
                                let engine = host.engine();
                                let hit = engine.borrow().hit_test(cursor.0, cursor.1);
                                hit.map(|id| id.to_string())
                                    .unwrap_or_else(|| "null".to_string())
                            };
                            let event_json = format!(
                                r#"{{"type":"wheel","dy":{dy},"node":{node}}}"#
                            );
                            if let Err(err) = host.dispatch(&event_json) {
                                eprintln!("tardis: {err}");
                            }
                            dirty = true;
                        }
                        WindowEvent::Touch(touch) => {
                            let (phase, pressed) = match touch.phase {
                                TouchPhase::Started => ("down", true),
                                TouchPhase::Moved => ("move", true),
                                TouchPhase::Ended | TouchPhase::Cancelled => ("up", false),
                            };
                            cursor = (
                                (touch.location.x / scale) as f32,
                                (touch.location.y / scale) as f32,
                            );
                            mouse_down = pressed;
                            let node = {
                                let engine = host.engine();
                                let hit = engine.borrow().hit_test(cursor.0, cursor.1);
                                hit.map(|id| id.to_string())
                                    .unwrap_or_else(|| "null".to_string())
                            };
                            let event_json = format!(
                                r#"{{"type":"pointer","phase":"{phase}","x":{},"y":{},"node":{node}}}"#,
                                cursor.0, cursor.1
                            );
                            if let Err(err) = host.dispatch(&event_json) {
                                eprintln!("tardis: {err}");
                            }
                            update_accessibility(&mut adapter, &host, &mut classes);
                            dirty = true;
                        }
                        WindowEvent::MouseInput { state, button, .. } => {
                            if button != MouseButton::Left {
                                return;
                            }
                            mouse_down = state == ElementState::Pressed;
                            let phase = if state == ElementState::Pressed {
                                "down"
                            } else {
                                "up"
                            };
                            let node = {
                                let engine = host.engine();
                                let hit = engine.borrow().hit_test(cursor.0, cursor.1);
                                hit.map(|id| id.to_string()).unwrap_or_else(|| "null".to_string())
                            };
                            let event_json = format!(
                                r#"{{"type":"pointer","phase":"{phase}","x":{},"y":{},"node":{node}}}"#,
                                cursor.0, cursor.1
                            );
                            if let Err(err) = host.dispatch(&event_json) {
                                eprintln!("tardis: {err}");
                            }
                            update_accessibility(&mut adapter, &host, &mut classes);
                            dirty = true;
                        }
                        WindowEvent::RedrawRequested => {
                            dirty = false;
                            #[cfg(feature = "wgpu")]
                            if let Some(presenter) = presenter.as_mut() {
                                let result = {
                                    let engine = host.engine();
                                    let mut engine = engine.borrow_mut();
                                    presenter.present(&mut engine)
                                };
                                if let Err(err) = result {
                                    eprintln!("tardis: wgpu present: {err}");
                                }
                                return;
                            }
                            let rendered = {
                                let engine = host.engine();
                                let mut engine = engine.borrow_mut();
                                engine.render_argb()
                            };
                            let (pixels, width, height) = match rendered {
                                Ok(frame) => frame,
                                Err(err) => {
                                    eprintln!("tardis: render: {err}");
                                    return;
                                }
                            };
                            let (Some(width), Some(height)) =
                                (NonZeroU32::new(width), NonZeroU32::new(height))
                            else {
                                return;
                            };
                            if let Err(err) = surface.resize(width, height) {
                                eprintln!("tardis: surface resize: {err}");
                                return;
                            }
                            let mut buffer = match surface.buffer_mut() {
                                Ok(buffer) => buffer,
                                Err(err) => {
                                    eprintln!("tardis: surface buffer: {err}");
                                    return;
                                }
                            };
                            buffer.copy_from_slice(&pixels);
                            if let Err(err) = buffer.present() {
                                eprintln!("tardis: present: {err}");
                            }
                        }
                        _ => {}
                        }
                    }
                    Event::UserEvent(UserEvent::AccessKit(event)) => {
                        match &event.window_event {
                            accesskit_winit::WindowEvent::InitialTreeRequested => {
                                update_accessibility(&mut adapter, &host, &mut classes);
                            }
                            accesskit_winit::WindowEvent::ActionRequested(request) => {
                                dispatch_action(&host, request);
                                update_accessibility(&mut adapter, &host, &mut classes);
                            }
                            _ => {}
                        }
                    }
                    Event::AboutToWait if dirty => window.request_redraw(),
                    _ => {}
                }
            })
            .map_err(|err| format!("event loop run: {err}"))
    }
}
