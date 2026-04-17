import axios from 'axios';

export async function publishToZhihu(cookie: string, title: string, content: string) {
  const url = 'https://zhuanlan.zhihu.com/api/articles';
  const response = await axios.post(url, {
    title, content, delta_time: 0
  }, {
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  });
  return response.data;
}

export async function publishToJuejin(cookie: string, title: string, content: string) {
  const url = 'https://api.juejin.cn/content_api/v1/article/draft/create';
  const response = await axios.post(url, {
    title, mark_content: content,
  }, {
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  });
  return response.data;
}

export async function publishToCSDN(cookie: string, title: string, content: string) {
  const url = 'https://blog-console-api.csdn.net/v1/editor/saveArticle';
  const response = await axios.post(url, {
    title, content, markdowncontent: content
  }, {
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  });
  return response.data;
}
