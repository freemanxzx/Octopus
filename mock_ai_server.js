import http from 'http';

const PORT = 3040;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            if (req.url.includes('/chat/completions')) {
                setTimeout(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        choices: [{
                            message: {
                                content: "✨ **这是经过 AI 实时分析与润色后的测试级超级文本！**\n\n网络连通性：完美畅通。\n核心组件组装状态：通过。\n\n> ✅ *全本地化端到端 (E2E) 模拟服务器已成功捕获通过 Fetch 层下发的规范报文，这证明完整的 OpenAI 模型对接机制运行正常！*"
                            }
                        }]
                    }));
                }, 1000); // simulate 1 sec thinking 
            } else if (req.url.includes('/images/generations')) {
                // Return a beautiful free placeholder dummy image
                setTimeout(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        data: [{
                            url: "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=1024&auto=format&fit=crop"
                        }]
                    }));
                }, 2000); // simulate 2 sec diffusions
            } else {
                res.writeHead(404);
                res.end();
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Mock AI Engine running on http://localhost:${PORT}/v1`);
});
