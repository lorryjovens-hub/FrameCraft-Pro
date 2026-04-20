use reqwest::Client;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::info;

use crate::ai::error::AIError;
use crate::ai::{AIProvider, GenerateRequest, VideoGenerateRequest};

const WANXIANG_BASE_URL: &str = "https://wanxiang.cn";
const POLL_INTERVAL_MS: u64 = 3000;

#[derive(Debug, Deserialize)]
struct WanxiangSubmitResponse {
    task_id: Option<String>,
    task_ids: Option<Vec<String>>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WanxiangStatusResponse {
    status: String,
    video_url: Option<String>,
    error_message: Option<String>,
}

pub struct WanxiangProvider {
    client: Client,
    api_key: Arc<RwLock<Option<String>>>,
}

impl WanxiangProvider {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: Arc::new(RwLock::new(None)),
        }
    }

    fn sanitize_model(model: &str) -> String {
        model
            .split_once('/')
            .map(|(_, bare)| bare.to_string())
            .unwrap_or_else(|| model.to_string())
    }

    fn resolve_model_path(model: &str) -> &'static str {
        let sanitized_model = Self::sanitize_model(model);
        match sanitized_model.as_str() {
            "video" => "wanxiang/video",
            _ => "wanxiang/video",
        }
    }

    fn resolve_aspect_ratio(aspect_ratio: &str) -> &str {
        match aspect_ratio {
            "16:9" => "16:9",
            "9:16" => "9:16",
            "1:1" => "1:1",
            "4:3" => "4:3",
            "3:4" => "3:4",
            _ => "16:9",
        }
    }
}

impl Default for WanxiangProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl AIProvider for WanxiangProvider {
    fn name(&self) -> &str {
        "wanxiang"
    }

    fn supports_model(&self, model: &str) -> bool {
        matches!(
            Self::sanitize_model(model).as_str(),
            "video"
        )
    }

    fn list_models(&self) -> Vec<String> {
        vec![
            "wanxiang/video".to_string(),
        ]
    }

    async fn set_api_key(&self, api_key: String) -> Result<(), AIError> {
        let mut key = self.api_key.write().await;
        *key = Some(api_key);
        Ok(())
    }

    async fn generate(&self, _request: GenerateRequest) -> Result<String, AIError> {
        Err(AIError::Provider("Wanxiang provider does not support image generation, only video".to_string()))
    }

    async fn generate_video(&self, request: VideoGenerateRequest) -> Result<String, AIError> {
        let api_key = self
            .api_key
            .read()
            .await
            .clone()
            .ok_or_else(|| AIError::InvalidRequest("API key not set".to_string()))?;

        let model_path = Self::resolve_model_path(&request.model);
        let aspect_ratio = Self::resolve_aspect_ratio(&request.aspect_ratio);

        info!(
            "[Wanxiang Request] model: {}, duration: {}, aspect_ratio: {}",
            request.model, request.duration, aspect_ratio
        );

        let submit_endpoint = format!("{}/api/v1/video/generate", WANXIANG_BASE_URL);
        let mut input = json!({
            "model": model_path,
            "prompt": request.prompt,
            "aspect_ratio": aspect_ratio,
            "duration": request.duration,
        });

        if let Some(reference_images) = request.reference_images.as_ref().filter(|images| !images.is_empty()) {
            input["image_urls"] = json!(reference_images);
        }

        let submit_response = self
            .client
            .post(&submit_endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&input)
            .send()
            .await?;

        if !submit_response.status().is_success() {
            let status = submit_response.status();
            let error_text = submit_response.text().await.unwrap_or_default();
            return Err(AIError::Provider(format!(
                "Wanxiang submit failed {}: {}",
                status, error_text
            )));
        }

        let submit_raw = submit_response.text().await.unwrap_or_default();
        let submit_body = serde_json::from_str::<WanxiangSubmitResponse>(&submit_raw).map_err(|err| {
            AIError::Provider(format!(
                "Wanxiang submit invalid JSON response: {}; raw={}",
                err, submit_raw
            ))
        })?;

        let task_id = submit_body.task_id.or_else(|| {
            submit_body.task_ids.as_ref().and_then(|ids| ids.first().cloned())
        }).ok_or_else(|| {
            AIError::Provider(format!("Wanxiang submit returned no task_id: {}", submit_raw))
        })?;

        loop {
            sleep(Duration::from_millis(POLL_INTERVAL_MS)).await;

            let status_endpoint = format!("{}/api/v1/video/status/{}", WANXIANG_BASE_URL, task_id);
            let status_response = self
                .client
                .get(&status_endpoint)
                .header("Authorization", format!("Bearer {}", api_key))
                .send()
                .await?;

            if !status_response.status().is_success() {
                let status = status_response.status();
                let error_text = status_response.text().await.unwrap_or_default();
                return Err(AIError::Provider(format!(
                    "Wanxiang status check failed {}: {}",
                    status, error_text
                )));
            }

            let status_raw = status_response.text().await.unwrap_or_default();
            let status_body = serde_json::from_str::<WanxiangStatusResponse>(&status_raw).map_err(|err| {
                AIError::Provider(format!(
                    "Wanxiang status invalid JSON response: {}; raw={}",
                    err, status_raw
                ))
            })?;

            match status_body.status.as_str() {
                "pending" | "processing" | "running" => {
                    info!("[Wanxiang] Task {} status: {}", task_id, status_body.status);
                    continue;
                }
                "completed" | "succeeded" => {
                    if let Some(video_url) = status_body.video_url {
                        return Ok(video_url);
                    }
                    return Err(AIError::Provider("Wanxiang completed but no video_url returned".to_string()));
                }
                "failed" | "error" => {
                    return Err(AIError::TaskFailed(status_body.error_message.unwrap_or_else(|| "Unknown error".to_string())));
                }
                _ => {
                    return Err(AIError::Provider(format!("Wanxiang unexpected status: {}", status_body.status)));
                }
            }
        }
    }
}