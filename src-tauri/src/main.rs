#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri_plugin_sql::TauriSql;

#[tauri::command]
async fn fetch_async(url: &str) -> Result<String,String> {
  let req = match reqwest::get(url).await {
    Ok(val) => val,
    Err(_) => return Err("".to_string()),
  };
  match req.text().await {
    Ok(val) => return Ok(val),
    Err(_) => return Err("".to_string()),
  };
}

// use sqlx::Connection;
// let conn = SqliteConnection::connect("sqlite::memory:").await?;

// #[tauri::command]
// fn add_feed(
//   feed_id: u64,
//   name: &str,
//   feed_type: &str,
//   feed_url: &str,
//   last_updated: &str,
//   update_interval: u64,
//   max_entries_per_week: u64) -> String {

//   format!("Added feed: {}", name)
// }

fn main() {
  let context = tauri::generate_context!();
  tauri::Builder::default()
    .menu(if cfg!(target_os = "macos") {
      tauri::Menu::os_default(&context.package_info().name)
    } else {
      tauri::Menu::default()
    })
    .invoke_handler(tauri::generate_handler![fetch_async])
    .plugin(TauriSql::default())
    .run(context)
    .expect("error while running tauri application");
}
