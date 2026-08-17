use core_types::{EngineConfig, Platform};
use std::path::Path;

pub struct EngineDetector;

impl EngineDetector {
    /// Returns default engine configurations for all platforms with automated detection
    pub fn get_default_configs() -> Vec<EngineConfig> {
        let is_linux = cfg!(target_os = "linux");

        vec![
            Self::create_engine_config(
                Platform::Snes,
                "RetroArch (Snes9x)",
                if is_linux { "org.libretro.RetroArch" } else { "retroarch" },
                vec!["-L".to_string(), "snes9x_libretro".to_string()],
                is_linux,
                if is_linux { Some("org.libretro.RetroArch".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::Genesis,
                "RetroArch (Genesis Plus GX)",
                if is_linux { "org.libretro.RetroArch" } else { "retroarch" },
                vec!["-L".to_string(), "genesis_plus_gx_libretro".to_string()],
                is_linux,
                if is_linux { Some("org.libretro.RetroArch".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::Gba,
                "RetroArch (mGBA)",
                if is_linux { "org.libretro.RetroArch" } else { "retroarch" },
                vec!["-L".to_string(), "mgba_libretro".to_string()],
                is_linux,
                if is_linux { Some("org.libretro.RetroArch".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::N64,
                "RetroArch (Mupen64Plus-Next)",
                if is_linux { "org.libretro.RetroArch" } else { "retroarch" },
                vec!["-L".to_string(), "mupen64plus_next_libretro".to_string()],
                is_linux,
                if is_linux { Some("org.libretro.RetroArch".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::Ps1,
                "DuckStation",
                if is_linux { "org.duckstation.DuckStation" } else { "duckstation-qt" },
                vec!["-batch".to_string()],
                is_linux,
                if is_linux { Some("org.duckstation.DuckStation".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::Ps2,
                "PCSX2",
                if is_linux { "net.pcsx2.PCSX2" } else { "pcsx2-qt" },
                vec!["-batch".to_string()],
                is_linux,
                if is_linux { Some("net.pcsx2.PCSX2".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::Gamecube,
                "Dolphin",
                if is_linux { "org.DolphinEmu.dolphin-emu" } else { "Dolphin" },
                vec!["-b".to_string(), "-e".to_string()],
                is_linux,
                if is_linux { Some("org.DolphinEmu.dolphin-emu".to_string()) } else { None },
            ),
            Self::create_engine_config(
                Platform::Pc,
                "Native PC Game Runner",
                "",
                vec![],
                false,
                None,
            ),
        ]
    }

    fn create_engine_config(
        platform: Platform,
        engine_name: &str,
        executable_path: &str,
        default_args: Vec<String>,
        is_flatpak: bool,
        flatpak_id: Option<String>,
    ) -> EngineConfig {
        let is_detected = Self::is_engine_available(executable_path, is_flatpak);
        EngineConfig {
            platform,
            engine_name: engine_name.to_string(),
            executable_path: executable_path.to_string(),
            default_args,
            is_flatpak,
            flatpak_id,
            is_detected,
        }
    }

    /// Checks if executable or flatpak is available on the system
    pub fn is_engine_available(executable_path: &str, is_flatpak: bool) -> bool {
        if executable_path.is_empty() {
            return true; // Native PC runner is always available
        }

        if is_flatpak {
            // Check if flatpak application directory exists on Linux or fallback to true in dev
            let flatpak_var_path = format!("/var/lib/flatpak/app/{}", executable_path);
            let user_flatpak_path = format!("{}/.local/share/flatpak/app/{}", std::env::var("HOME").unwrap_or_default(), executable_path);
            Path::new(&flatpak_var_path).exists() || Path::new(&user_flatpak_path).exists()
        } else {
            // Check direct file path or assume standard binary
            Path::new(executable_path).exists()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_engine_configs() {
        let configs = EngineDetector::get_default_configs();
        assert!(!configs.is_empty());

        let snes_config = configs.iter().find(|c| c.platform == Platform::Snes);
        assert!(snes_config.is_some());
        assert!(snes_config.unwrap().engine_name.contains("RetroArch"));

        let ps1_config = configs.iter().find(|c| c.platform == Platform::Ps1);
        assert!(ps1_config.is_some());
        assert!(ps1_config.unwrap().engine_name.contains("DuckStation"));
    }

    #[test]
    fn test_is_engine_available_empty_path() {
        assert!(EngineDetector::is_engine_available("", false));
    }

    #[test]
    fn test_is_engine_available_non_existent_binary() {
        assert!(!EngineDetector::is_engine_available("/non/existent/path/binary.exe", false));
    }
}
