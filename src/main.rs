use std::process::Command;

fn main() {
    let status = Command::new("/Users/pradyotranjan/how-much-vscode/how-much-vscode")
        .current_dir("/Users/pradyotranjan/how-much-vscode")
        .status()
        .expect("failed to execute process");

    println!("Exited with: {status}");
}