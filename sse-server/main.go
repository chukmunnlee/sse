package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Message struct {
	Username string `form:"username" json:"username"`
	Text     string `form:"text" json:"text"`
}

type StreamResponse struct {
	Timestamp int64  `json:"timestamp"`
	Payload   string `json:"payload"`
}

func mkGetStream(ch <-chan string) func(*gin.Context) {
	return func(c *gin.Context) {
		fmt.Printf(">>> got a stream request: %s\n", c.Request.RequestURI)
		c.Stream(func(w io.Writer) bool {
			select {
			case msg := <-ch:
				fmt.Printf("<<< SSE: %s\n", msg)
				resp := StreamResponse{Timestamp: time.Now().UnixMilli(), Payload: msg}
				data, _ := json.Marshal(resp)
				fmt.Printf("<<< SSE: %s\n", data)
				writeSSEHeaders(c)
				c.SSEvent("message", string(data))
				fmt.Printf(">>> sent \n")

			case <-c.Writer.CloseNotify():
				fmt.Printf("connection close\n")
				c.JSON(http.StatusOK, gin.H{})
				return false
			}
			return true
		})
	}
}

func mkPostData(ch chan<- string) func(*gin.Context) {
	return func(c *gin.Context) {
		var data Message
		if err := c.ShouldBind(&data); nil != err {
			c.JSON(http.StatusBadRequest,
				gin.H{"error": err.Error()})
			return
		}
		fmt.Printf(">>> POST: %v\n", data)
		ch <- fmt.Sprintf("username: %s, text: %s", data.Username, data.Text)
		c.JSON(http.StatusAccepted, gin.H{})
	}
}

func setSSEHeaders() func(*gin.Context) {
	return func(c *gin.Context) {
		writeSSEHeaders(c)
		c.Next()
	}
}

func writeSSEHeaders(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Flush()
}

func main() {

	ch := make(chan string)

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"}

	r := gin.Default()

	r.Use(cors.New(config))

	r.POST("/api/data", mkPostData(ch))
	r.GET("/api/stream", setSSEHeaders(), mkGetStream(ch))

	r.Run(":5000")
}
