use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{CreateTestRequest, Test, UpdateTestRequest};

// GET /api/tests
pub async fn list_tests(State(pool): State<PgPool>) -> Result<Json<Vec<Test>>, StatusCode> {
    let tests = sqlx::query_as::<_, Test>(
        r#"
        SELECT id, title, content, created_at, updated_at
        FROM comic.test
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(tests))
}

// GET /api/tests/:id
pub async fn get_test(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Test>, StatusCode> {
    let test = sqlx::query_as::<_, Test>(
        r#"
        SELECT id, title, content, created_at, updated_at
        FROM comic.test
        WHERE id = $1
        "#
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(test))
}

// POST /api/tests
pub async fn create_test(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateTestRequest>,
) -> Result<(StatusCode, Json<Test>), StatusCode> {
    let test = sqlx::query_as::<_, Test>(
        r#"
        INSERT INTO comic.test (title, content)
        VALUES ($1, $2)
        RETURNING id, title, content, created_at, updated_at
        "#
    )
    .bind(&payload.title)
    .bind(&payload.content)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(test)))
}

// PUT /api/tests/:id
pub async fn update_test(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTestRequest>,
) -> Result<Json<Test>, StatusCode> {
    // Update updated_at timestamp
    let test = sqlx::query_as::<_, Test>(
        r#"
        UPDATE comic.test
        SET
            title = COALESCE($2, title),
            content = COALESCE($3, content),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, title, content, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(&payload.title)
    .bind(&payload.content)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(test))
}

// DELETE /api/tests/:id
pub async fn delete_test(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, StatusCode> {
    let result = sqlx::query(
        r#"
        DELETE FROM comic.test
        WHERE id = $1
        "#
    )
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if result.rows_affected() == 0 {
        return Err(StatusCode::NOT_FOUND);
    }

    Ok(StatusCode::NO_CONTENT)
}
