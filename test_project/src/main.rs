use tplay::{open_media, ImagePipeline};
use tplay::pipeline::char_maps::CHARS1;

fn main() -> Result<(), tplay::common::errors::MyError> {
    // open media (path or URL) — returns MediaData
    let media = open_media("path_or_url_or_youtube".to_string(), "firefox".to_string())?;
    let mut frames = media.frame_iter;

    // build an ImagePipeline (80x24, default charset)
    let pipeline = ImagePipeline::new((80, 24), CHARS1.chars().collect(), false);

    // take the first frame and convert to ASCII
    if let Some(frame) = frames.next() {
        let resized = pipeline.resize(&frame)?;
        let ascii = pipeline.to_ascii(&resized.into_luma8());
        println!("{}", ascii);
    }

    Ok(())
}