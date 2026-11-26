use tardis_ts_core::Engine;

fn main() {
    let mut engine = Engine::new(400.0, 300.0);
    let patch = r##"{"v":0,"frame":1,"ops":[
      {"op":"create","id":1,"kind":"view","parent":0,"index":0},
      {"op":"style","id":1,"props":{"padding":20,"backgroundColor":"#ff0000"}},
      {"op":"create","id":2,"kind":"text","parent":1,"index":0},
      {"op":"text","id":2,"value":"Hello"},
      {"op":"style","id":2,"props":{"fontSize":24,"color":"#ffffff"}}
    ]}"##;
    engine.apply_json(patch).unwrap();
    println!("{:#?}", engine.dump().unwrap());
    engine.render_png("/tmp/tardis-debug.png").unwrap();
    scan();
}

#[allow(dead_code)]
fn scan() {
    let pixmap = tiny_skia::Pixmap::load_png("/tmp/tardis-debug.png").unwrap();
    let mut max_green = 0u8;
    let mut white = 0;
    for y in 20..54 {
        for x in 20..100 {
            let p = pixmap.pixel(x, y).unwrap();
            max_green = max_green.max(p.green());
            if p.red() > 200 && p.green() > 200 && p.blue() > 200 {
                white += 1;
            }
        }
    }
    println!("max green {max_green}, white {white}");
}
