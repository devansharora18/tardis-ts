fn main() {
    let pixmap = tiny_skia::Pixmap::load_png("/tmp/tardis-debug.png").unwrap();
    println!("size {}x{}", pixmap.width(), pixmap.height());
    let mut white = 0;
    let (mut minx, mut miny, mut maxx, mut maxy) = (u32::MAX, u32::MAX, 0u32, 0u32);
    for y in 0..pixmap.height() {
        for x in 0..pixmap.width() {
            let p = pixmap.pixel(x, y).unwrap();
            if p.red() > 200 && p.green() > 200 && p.blue() > 200 {
                white += 1;
                minx = minx.min(x); miny = miny.min(y); maxx = maxx.max(x); maxy = maxy.max(y);
            }
        }
    }
    println!("white {white} bbox {minx},{miny}..{maxx},{maxy}");
    for (x, y) in [(30, 10), (30, 25), (40, 30), (50, 40), (25, 45)] {
        if let Some(p) = pixmap.pixel(x, y) {
            println!("({x},{y}) rgba {} {} {} {}", p.red(), p.green(), p.blue(), p.alpha());
        }
    }
}
