const fs = require('fs');
const file = 'd:/自媒体/Octopus/src/components/Editor.vue';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import CropperModal')) {
    content = content.replace('import { uploadImage, type UploadConfig } from \'../utils/uploader\';', 'import { uploadImage, type UploadConfig } from \'../utils/uploader\';\nimport CropperModal from \'./CropperModal.vue\';');

    const logicStr = `
// --- Image Cropper Logic ---
const isCropperOpen = ref(false);
const currentCropImageUrl = ref('');

const openCropper = (url) => {
  currentCropImageUrl.value = url;
  isCropperOpen.value = true;
};
const closeCropper = () => {
  isCropperOpen.value = false;
  currentCropImageUrl.value = '';
};

const handlePreviewClick = (e) => {
  const target = e.target;
  if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
    const src = target.getAttribute('src');
    if (src && !src.startsWith('data:image')) {
      openCropper(src);
    }
  }
};

const handleCropSave = async (file) => {
  try {
    const oldUrl = currentCropImageUrl.value;
    // Build a temp config fallback to GitHub or picgo if not strictly typed
    let conf = { provider: 'picgo' }; 
    const stored = localStorage.getItem('octopus-img');
    if (stored) {
        try { conf = JSON.parse(stored); } catch(e){}
    }
    const newUrl = await uploadImage(file, conf);
    
    // Replace markdown string
    content.value = content.value.replace(oldUrl, newUrl);
    closeCropper();
    
    // Toast
    if (typeof showToast === "function") {
        showToast("图片裁剪并替换成功", "success");
    }
  } catch (e) {
    console.error(e);
    if (typeof showToast === "function") showToast("替换失败：" + e.message, "error");
  }
};
// --- End Image Cropper Logic ---
`;

    content = content.replace('const isDesktop = ref(!!(window as any).electronAPI);', logicStr + '\nconst isDesktop = ref(!!(window as any).electronAPI);');

    // Add click handler to preview pane
    content = content.replace('<div class="preview-pane"', '<div class="preview-pane" @click="handlePreviewClick" ');

    // Add CropperModal to template Before </div>\n  </div>\n</template>
    const endTemplateIndex = content.lastIndexOf('</template>');
    const insertionPoint = content.lastIndexOf('</div>', content.lastIndexOf('</div>', endTemplateIndex - 1) - 1);
    
    // Wait, let's just do a string replace on <div v-if="toastState.visible" ...
    content = content.replace('</transition>\n    <!-- Note: removed isolated </main> that trapped modals -->', 
    `</transition>\n      <!-- Secondary Image Cropper Modal -->\n      <CropperModal :isOpen="isCropperOpen" :imageUrl="currentCropImageUrl" @close="closeCropper" @save="handleCropSave" />\n    <!-- Note: removed isolated </main> that trapped modals -->`);

    fs.writeFileSync(file, content);
    console.log("Successfully patched Editor.vue");
} else {
    console.log("Already patched");
}
