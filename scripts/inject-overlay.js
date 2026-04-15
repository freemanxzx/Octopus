import fs from 'fs';
let content = fs.readFileSync('src/components/Editor.vue', 'utf8');

const newMarkup = `          <!-- Image Host Configuration Dialog -->
          <transition name="fade">
            <div v-if="isImageConfigVisible" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center;" @click.self="isImageConfigVisible = false">
              <div class="custom-modal modern-config-modal" style="width: 520px; max-width: 90vw; padding: 28px; border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05); background: var(--bg-panel); display: flex; flex-direction: column; gap: 20px;">
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                     <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                     服务中心配置
                  </h3>
                  <button class="icon-btn" @click="isImageConfigVisible = false" style="background: var(--bg-hover); border: none; font-size: 1.1rem; color: var(--text-muted); cursor: pointer; transition: all 0.2s; padding: 6px; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>

                <!-- Image Sync Config Card -->
                <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: #8b5cf6;">cloud_upload</span>
                    <span style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">图床分发引擎配置</span>
                  </div>
                  
                  <div style="position: relative;">
                    <select v-model="uploadConfig.provider" style="width: 100%; padding: 12px 16px; border-radius: 10px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; font-weight: 500; outline: none; cursor: pointer; transition: border-color 0.2s; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222%22><polyline points=%226 9 12 15 18 9%22/></svg>'); background-repeat: no-repeat; background-position: right 14px center;">
                      <option value="base64">⬇️ 本地 Base64 原生内联 (免配置/体积受限)</option>
                      <option value="picgo">⚙️ PicGo 本地服务器挂载 (http://127.0.0.1:36677)</option>
                      <option value="github">🐙 GitHub 仓库直连 (jsDelivr CDN 全球分发)</option>
                      <option value="alioss">☁️ 阿里云 OSS 存储 (AliOSS)</option>
                      <option value="txcos">☁️ 腾讯云 COS 存储 (TxCOS)</option>
                      <option value="qiniu">☁️ 七牛云 存储 (Qiniu)</option>
                    </select>
                  </div>

                  <!-- GitHub Extra Form -->
                  <div v-if="uploadConfig.provider === 'github'" style="display: flex; flex-direction: column; gap: 12px; background: rgba(0,0,0,0.02); padding: 14px; border-radius: 10px; border: 1px dashed var(--border-subtle);">
                    <div>
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">GitHub Repo <span style="opacity: 0.6; font-weight: normal;">(如: john/blog-assets)</span></p>
                      <input v-model="uploadConfig.githubRepo" type="text" placeholder="username/repo" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                    <div>
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">Personal Access Token</p>
                      <input v-model="uploadConfig.githubToken" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxx" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">存储路径 <span style="opacity: 0.6; font-weight: normal;">(如: img/)</span></p>
                        <input v-model="uploadConfig.githubPath" type="text" placeholder="images/2026" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">分支 <span style="opacity: 0.6; font-weight: normal;">(默认 main)</span></p>
                        <input v-model="uploadConfig.githubBranch" type="text" placeholder="main" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                    </div>
                  </div>

                  <!-- S3/OSS Extra Form -->
                  <div v-if="['alioss', 'txcos', 'qiniu'].includes(uploadConfig.provider)" style="display: flex; flex-direction: column; gap: 12px; background: rgba(0,0,0,0.02); padding: 14px; border-radius: 10px; border: 1px dashed var(--border-subtle);">
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">AccessKey (AK)</p>
                        <input v-model="uploadConfig.accessKey" type="text" placeholder="AK..." style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">SecretKey (SK)</p>
                        <input v-model="uploadConfig.secretKey" type="password" placeholder="SK..." style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                    </div>
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">Bucket名称</p>
                        <input v-model="uploadConfig.bucket" type="text" placeholder="my-bucket" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">所属区域 (Region)</p>
                        <input v-model="uploadConfig.region" type="text" :placeholder="uploadConfig.provider === 'qiniu' ? 'z0' : (uploadConfig.provider === 'alioss' ? 'oss-cn-hangzhou' : 'ap-guangzhou')" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                    </div>
                    <div>
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">存储目录路径 <span style="opacity: 0.6; font-weight: normal;">(可选)</span></p>
                      <input v-model="uploadConfig.path" type="text" placeholder="blog/uploads/" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                    <div v-if="uploadConfig.provider === 'qiniu'">
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">CDN绑定的加速域名 <span style="opacity: 0.6; font-weight: normal;">(七牛必填)</span></p>
                      <input v-model="uploadConfig.domain" type="text" placeholder="https://cdn.example.com" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                  </div>

                  <div v-if="uploadConfig.provider === 'picgo'" style="padding: 12px 14px; background: rgba(59, 130, 246, 0.08); border-radius: 8px; display: flex; align-items: flex-start; gap: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: #3b82f6; margin-top: 2px;">info</span>
                    <p style="margin: 0; font-size: 12px; color: #3b82f6; line-height: 1.5; font-weight: 500;">请确保后台已启动 <b>PicGo 桌面端程序</b>，并在设置中开启 Server 功能（默认端口 36677），编辑器会静默桥接该内网接口。</p>
                  </div>
                </div>

                <!-- AI Engine Config Card -->
                <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 14px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; color: #10b981;">smart_toy</span>
                    <span style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">AI 智能引擎模型凭证</span>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">OpenAI 兼容型代理 API 主机地址</p>
                      <input v-model="uploadConfig.aiEndpoint" type="text" placeholder="https://api.openai.com/v1" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                    <div>
                      <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">API 会话密匙 (Secret Key)</p>
                      <input v-model="uploadConfig.aiKey" type="password" placeholder="sk-..." style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                    </div>
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">对话分析大模型 ID</p>
                        <input v-model="uploadConfig.aiModel" type="text" placeholder="gpt-4o-mini" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                      <div style="flex: 1;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">多模态画图模型 ID</p>
                        <input v-model="uploadConfig.aiImageModel" type="text" placeholder="dall-e-3" style="width: 100%; padding: 10px 14px; border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); border: 1px solid var(--border-strong); font-size: 13px; outline: none; transition: border-color 0.2s;" />
                      </div>
                    </div>
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
                  <button class="btn btn-primary" style="padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3), 0 0 0 2px rgba(16, 185, 129, 0) inset; transition: all 0.2s; cursor: pointer;" @click="isImageConfigVisible = false">
                    <span class="material-symbols-outlined" style="font-size: 20px;">check_circle</span>
                    保存配置并接驳服务
                  </button>
                </div>
              </div>
            </div>
          </transition>
`;

const match = content.match(/<!-- Image Host Configuration Dialog -->[\s\S]*?<div class="export-modal custom-modal modern-config-modal"[\s\S]*?<\/div>[\s\S]*?<\/transition>/) || content.match(/<!-- Image Host Configuration Dialog -->[\s\S]*?<h3 style="margin-top:0; margin-bottom: 1rem; color: var\(--text-primary\);">图床上传服务配置<\/h3>[\s\S]*?<\/div>[\s\S]*?<\/div>/);

// The actual old block right now because I ran git checkout src/components/Editor.vue:
//            <!-- Image Host Configuration Dialog -->
//          <div v-if="isImageConfigVisible" class="export-modal custom-modal" style="width: 420px; max-width: 90vw;">
//            <h3 style="margin-top:0; margin-bottom: 1rem; color: var(--text-primary);">图床上传服务配置</h3>
// ...
//            <div class="modal-actions" style="margin-top: 1.5rem;">
//              <button class="btn btn-primary" style="width: 100%; justify-content: center;" @click="isImageConfigVisible = false">保存配置并关闭</button>
//            </div>
//          </div>


const originalMatch = content.match(/<!-- Image Host Configuration Dialog -->[\s\S]*?<div class=\"modal-actions\" style=\"margin-top: 1.5rem;\">[\s\S]*?<\/div>\s*<\/div>/);

if (!originalMatch) {
  console.log('Failed to math the old block limit.');
  process.exit(1);
}

content = content.replace(originalMatch[0], newMarkup);
fs.writeFileSync('src/components/Editor.vue', content);
console.log('Fixed overlay injected successfully');
