use reqwest::{header, redirect, Client, StatusCode};
use serde::Deserialize;

const GITHUB_RELEASES_LATEST_API: &str =
    "https://api.github.com/repos/henjicc/Storyboard-Copilot/releases/latest";
const GITHUB_RELEASES_LATEST_REDIRECT: &str =
    "https://github.com/henjicc/Storyboard-Copilot/releases/latest";

#[derive(Debug, Deserialize)]
struct GithubLatestReleaseResponse {
    tag_name: Option<String>,
}

fn normalize_version(value: &str) -> String {
    value.trim().trim_start_matches(['v', 'V']).to_string()
}

fn extract_tag_from_location(location: &str) -> Option<String> {
    let raw_tag = location
        .rsplit("/tag/")
        .next()
        .or_else(|| location.rsplit("/releases/tag/").next())?;
    let normalized = normalize_version(raw_tag);
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn build_http_client(follow_redirect: bool) -> Result<Client, String> {
    let redirect_policy = if follow_redirect {
        redirect::Policy::limited(5)
    } else {
        redirect::Policy::none()
    };

    Client::builder()
        .redirect(redirect_policy)
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|error| format!("failed to build http client: {error}"))
}

async fn fetch_latest_release_tag() -> Result<String, String> {
    let api_client = build_http_client(true)?;
    let api_response = api_client
        .get(GITHUB_RELEASES_LATEST_API)
        .header(header::ACCEPT, "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28")
        .header(header::USER_AGENT, "Storyboard-Copilot-Updater")
        .send()
        .await
        .map_err(|error| format!("github api request failed: {error}"))?;

    if api_response.status().is_success() {
        let payload = api_response
            .json::<GithubLatestReleaseResponse>()
            .await
            .map_err(|error| format!("failed to decode github api response: {error}"))?;
        let tag = normalize_version(payload.tag_name.as_deref().unwrap_or_default());
        if !tag.is_empty() {
            return Ok(tag);
        }
    }

    let redirect_client = build_http_client(false)?;
    let redirect_response = redirect_client
        .get(GITHUB_RELEASES_LATEST_REDIRECT)
        .header(header::USER_AGENT, "Storyboard-Copilot-Updater")
        .send()
        .await
        .map_err(|error| format!("github releases redirect request failed: {error}"))?;

    if redirect_response.status() != StatusCode::FOUND
        && redirect_response.status() != StatusCode::MOVED_PERMANENTLY
        && !redirect_response.status().is_redirection()
    {
        return Err(format!(
            "failed to resolve latest release: status {}",
            redirect_response.status()
        ));
    }

    let location = redirect_response
        .headers()
        .get(header::LOCATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "missing location header in releases redirect".to_string())?;

    extract_tag_from_location(location).ok_or_else(|| {
        format!("failed to parse tag from releases redirect location: {location}")
    })
}

#[tauri::command]
pub async fn check_latest_release_tag() -> Result<Option<String>, String> {
    match fetch_latest_release_tag().await {
        Ok(tag) => Ok(Some(tag)),
        Err(error) => Err(error),
    }
}
