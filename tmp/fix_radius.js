import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../src/components/Editor.vue');
let content = fs.readFileSync(filePath, 'utf8');

const styleStartIndex = content.indexOf('<style scoped>');
if (styleStartIndex !== -1) {
    const preStyle = content.substring(0, styleStartIndex);
    let styleBlock = content.substring(styleStartIndex);
    
    // Globally purge border-radius
    styleBlock = styleBlock.replace(/border-radius:\s*[^;]+;/g, 'border-radius: 0 !important;');
    
    content = preStyle + styleBlock;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully purged all border-radius instances from the <style scoped> block.');
} else {
    console.log('Could not find <style scoped> block.');
}
