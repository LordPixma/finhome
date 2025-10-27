// Decode JWT token to see its contents
const token = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJnbG9iYWwtYWRtaW4tcHJvZC0xIiwiZW1haWwiOiJhZG1pbkBmaW5ob21lMzYwLmNvbSIsIm5hbWUiOiJHbG9iYWwgQWRtaW5pc3RyYXRvciIsInRlbmFudElkIjoiZ2xvYmFsLWFkbWluLXRlbmFudCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2MTUzMjAyNCwiZXhwIjoxNzYxNTM1NjI0fQ.GZXzqHGmWw8mhaJUNA7aQDb_Qf__O7rvMSP7bpoTKp4";

// Split the token and decode the payload
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));

console.log('JWT Payload:', JSON.stringify(payload, null, 2));