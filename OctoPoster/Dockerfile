# Stage 1: Build Vue Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package.json ./
# 尝试复制 lock 文件如果存在
COPY web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# Stage 2: Build Go Backend
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app
# 设置代理加速依赖下载（可选）
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server/main.go

# Stage 3: Final Production Image
FROM alpine:latest
# 安装的基础依赖如时区等
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app
# 复制必需的运行目录
COPY --from=backend-builder /app/prompts ./prompts
COPY --from=backend-builder /app/server .
# 复制静态构建产物
COPY --from=frontend-builder /app/web/dist ./web/dist

# 用于持久化数据的目录，可在运行容器时挂载
VOLUME ["/app/history", "/app/data"]

EXPOSE 12399

ENTRYPOINT ["./server"]
