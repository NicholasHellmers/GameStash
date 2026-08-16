use core_types::{SaveManifest, SyncStatus};

pub struct SaveSyncService;

impl SaveSyncService {
    /// Compares a client's incoming manifest with the cloud's stored manifest
    pub fn evaluate_sync_status(
        cloud_manifest: Option<&SaveManifest>,
        client_manifest: &SaveManifest,
    ) -> SyncStatus {
        match cloud_manifest {
            Some(cloud) => cloud.compare(client_manifest),
            None => SyncStatus::LocalNewer, // No cloud save exists yet
        }
    }
}
