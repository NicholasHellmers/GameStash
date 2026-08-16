use std::process::Command;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum LaunchError {
    #[error("Failed to execute process: {0}")]
    ProcessFailed(#[from] std::io::Error),
}

pub struct ProcessLauncher;

impl ProcessLauncher {
    /// Launches a local executable or emulator
    pub fn launch(executable_path: &str, args: &[String]) -> Result<u32, LaunchError> {
        let mut cmd = Command::new(executable_path);
        cmd.args(args);

        let child = cmd.spawn()?;
        Ok(child.id())
    }
}
