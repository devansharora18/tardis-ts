// Native runtime binary: headless frame rendering and a desktop window.

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use tardis_js::JsHost;

struct Args {
    bundle: PathBuf,
    width: u32,
    height: u32,
    scale: f32,
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
        window::run(host, args.width, args.height)?;
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
    use std::rc::Rc;

    use raw_window_handle::{
        DisplayHandle, HandleError, HasDisplayHandle, HasWindowHandle, WindowHandle,
    };
    use tardis_js::JsHost;
    use winit::event::{ElementState, Event, MouseButton, MouseScrollDelta, WindowEvent};
    use winit::event_loop::{ControlFlow, EventLoop};
    use winit::keyboard::{Key, NamedKey};
    use winit::window::WindowBuilder;

    struct SharedWindow(Rc<winit::window::Window>);

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

    pub fn run(host: JsHost, width: u32, height: u32) -> Result<(), String> {
        let event_loop = EventLoop::new().map_err(|err| format!("event loop: {err}"))?;
        let window = Rc::new(
            WindowBuilder::new()
                .with_title("Tardis")
                .with_inner_size(winit::dpi::LogicalSize::new(width, height))
                .build(&event_loop)
                .map_err(|err| format!("window: {err}"))?,
        );
        let context = softbuffer::Context::new(SharedWindow(window.clone()))
            .map_err(|err| format!("softbuffer context: {err}"))?;
        let mut surface = softbuffer::Surface::new(&context, SharedWindow(window.clone()))
            .map_err(|err| format!("softbuffer surface: {err}"))?;

        let mut cursor = (0.0_f32, 0.0_f32);
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
                    Event::WindowEvent { event, .. } => match event {
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
                            dirty = true;
                        }
                        WindowEvent::CursorMoved { position, .. } => {
                            cursor = (
                                (position.x / scale) as f32,
                                (position.y / scale) as f32,
                            );
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
                        WindowEvent::MouseInput { state, button, .. } => {
                            if button != MouseButton::Left {
                                return;
                            }
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
                            dirty = true;
                        }
                        WindowEvent::RedrawRequested => {
                            dirty = false;
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
                    },
                    Event::AboutToWait if dirty => window.request_redraw(),
                    _ => {}
                }
            })
            .map_err(|err| format!("event loop run: {err}"))
    }
}
