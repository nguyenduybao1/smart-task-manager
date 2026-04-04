# Sync Engine Strategy

## Approach: Last-Write-Wins with Vector Clock

### Core Concepts

**1. Local-first**
- App hoạt động được khi offline
- Mọi thay đổi được lưu local trước
- Sync lên server khi có mạng

**2. Version tracking**
- Mỗi task có `version` number
- Mỗi thay đổi tăng version lên 1
- Server giữ version cao nhất

**3. Conflict detection**
- Client gửi lên `baseVersion` — version lúc bắt đầu edit
- Server so sánh với `currentVersion`
- Nếu khác nhau → có conflict

**4. Conflict resolution**
- Last-Write-Wins (LWW) — timestamp mới hơn thắng
- Field-level merge — merge từng field riêng lẻ
- Manual resolution — flag conflict cho user quyết định

### Conflict Resolution Priority
1. `DONE` status không bao giờ bị overwrite
2. Timestamp mới hơn thắng cho các fields thông thường
3. Nếu timestamp bằng nhau → server wins