FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o server .

FROM alpine:latest
RUN apk add --no-cache sqlite-libs libc6-compat

WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080

CMD ["./server"]
