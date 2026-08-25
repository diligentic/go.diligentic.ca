CREATE TABLE clicks (
  path TEXT NOT NULL,
  clicked_at INTEGER NOT NULL
);

CREATE INDEX idx_clicks_clicked_at_path ON clicks (clicked_at, path);
