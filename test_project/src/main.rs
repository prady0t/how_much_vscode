use std::io::Write;
use std::{thread, time::Duration};

use tplay::{open_media, ImagePipeline};
use tplay::pipeline::char_maps::CHARS1;

fn main() -> Result<(), tplay::common::errors::MyError> {
    // open media (path or URL) — returns MediaData
    let media = open_media("/Users/pradyotranjan/how-much-vscode/test_project/src/PPy.gif".to_string(), "firefox".to_string())?;

    // collect frames so we can loop the animation
    let frames: Vec<_> = media.frame_iter.collect();
    if frames.is_empty() {
        eprintln!("no frames found");
        return Ok(());
    }

    // build an ImagePipeline (80x24, default charset)
    let pipeline = ImagePipeline::new((80, 24), CHARS1.chars().collect(), false);

    // ANSI sequences to clear and move cursor to top-left
    const CLEAR: &str = "\x1B[2J\x1B[H";

    // play frames in a loop; use a fallback delay of 100ms between frames
    let frame_delay = Duration::from_millis(100);

    loop {
        for frame in &frames {
            let resized = pipeline.resize(frame)?;
            let ascii = pipeline.to_ascii(&resized.into_luma8());

            print!("{}{}", CLEAR, ascii);
            let _ = std::io::stdout().flush();

            thread::sleep(frame_delay);
        }
    }
}