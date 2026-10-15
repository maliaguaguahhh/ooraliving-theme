// Purely local Liquid preview. Does not authenticate with or write to Shopify.
// Install liquidjs in /private/tmp/nfc-preview-deps, then run: node preview/nfc-server.mjs
import { Liquid } from '/private/tmp/nfc-preview-deps/node_modules/liquidjs/dist/liquid.node.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
const root = process.cwd();
const read = name => fs.readFile(path.join(root, name), 'utf8');
const json = async name => JSON.parse((await read(name)).replace(/\/\*[\s\S]*?\*\//g, ''));
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const engine = new Liquid({root:path.join(root,'snippets'),extname:'.liquid'});
engine.registerFilter('asset_url', value => '/assets/'+value);
engine.registerFilter('stylesheet_tag', value => `<link rel="stylesheet" href="${escape(value)}">`);
engine.registerFilter('image_url', (image,...args) => {
  const options=Object.fromEntries(args.filter(Array.isArray));
  const url=typeof image==='string'?image:image?.src;
  if(!url) return '';
  return url.replace('shopify://shop_images/','https://ooraliving.com/cdn/shop/files/') + (url.includes('?')?'&':'?')+'width='+(options.width||800);
});
engine.registerFilter('image_tag', (url,...args) => {
  const attrs=Object.fromEntries(args.filter(Array.isArray));
  delete attrs.widths;
  return `<img src="${escape(url)}" ${Object.entries(attrs).map(([key,value])=>`${key}="${escape(value)}"`).join(' ')}>`;
});
engine.registerFilter('video_tag', (video,...args)=>{
  const attrs=Object.fromEntries(args.filter(Array.isArray));
  return `<video controls playsinline preload="none" poster="${escape(video.preview_image?.src)}" ${Object.entries(attrs).filter(([k])=>!['controls','playsinline'].includes(k)).map(([k,v])=>`${k}="${escape(v)}"`).join(' ')}><source src="${escape(video.sources[0].url)}" type="video/mp4"></video>`;
});
engine.registerFilter('t', function(key,...args){
  let value=key.split('.').reduce((v,k)=>v?.[k],this.context.get(['translations']))||key;
  for(const [k,v] of args.filter(Array.isArray)) value=value.replaceAll('{{ '+k+' }}',String(v));
  return value;
});
engine.registerFilter('inline_asset_content', async name => {try{return await read('assets/'+name);}catch{return '';}});
const liveVideo={id:'preview-live-setup',aspect_ratio:9/16,preview_image:{src:'https://ooraliving.com/cdn/shop/files/preview_images/1148_84092585-d855-4656-8b41-0342a6d3d5cf.png?v=1789577058',aspect_ratio:9/16},sources:[{url:'https://ooraliving.com/cdn/shop/videos/c/vp/ef74183b313b417aa4f3495cf9db9bbb/ef74183b313b417aa4f3495cf9db9bbb.HD-1080p-7.2Mbps-93288065.mp4?v=0',mime_type:'video/mp4'}]};
async function renderPage(url){
  const template=await json('templates/page.nfc-preview.json');
  const settings=(await json('config/settings_data.json')).current;
  const translations=await json('locales/en.default.json');
  const fixture=url.searchParams.get('fixture');
  const tutorials=template.sections.nfc_tutorials;
  // Live media is a preview fixture only; exported theme configuration is untouched.
  liveVideo.sources[0].format='mp4';
  if(fixture!=='export') tutorials.blocks.setup.settings.video=liveVideo;
  if(fixture==='five') {
    for(let i=3;i<=5;i++) {const id='sample'+i;tutorials.blocks[id]={type:'tutorial',settings:{title:'Layout test '+i,video:liveVideo}};tutorials.block_order.push(id);}
  }
  let body='';
  for(const id of template.order){
    const section=template.sections[id];
    const source=await read('sections/'+section.type+'.liquid');
    const schema=JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
    section.id=id;
    section.settings={...Object.fromEntries((schema.settings||[]).filter(x=>'default' in x).map(x=>[x.id,x.default])),...section.settings};
    section.blocks=(section.block_order||[]).map(blockId=>{
      const block={...section.blocks[blockId],id:blockId};
      const blockSchema=schema.blocks?.find(x=>x.type===block.type);
      block.settings={...Object.fromEntries((blockSchema?.settings||[]).filter(x=>'default' in x).map(x=>[x.id,x.default])),...block.settings};
      if(block.settings.video_url){ const u=new URL(block.settings.video_url);block.settings.video_url={id:u.searchParams.get('v'),type:'youtube',toString:()=>u.href}; }
      return block;
    });
    const context={
      section,settings,translations,localization:{language:{iso_code:'en'}},page:{title:'NFC Setup Guide',content:'<p>Master NFC shortcuts in minutes. Watch our video tutorials, explore ready-to-use templates, and download shortcuts to unlock the full potential of your TapNest and your routines.</p>'},cart:{item_count:0},request:{design_mode:false}
    };
    const content=await engine.parseAndRender(source.replace(/{% schema %}[\s\S]*?{% endschema %}/,''),context,{globals:context});
    body+=`<div class="shopify-section" id="shopify-section-${id}">${content}${(section.custom_css||[]).map(css=>`<style>${css}</style>`).join('')}</div>`;
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NFC — local Astra preview</title><link rel="stylesheet" href="/assets/styles.css"><link rel="stylesheet" href="/preview/frame.css"></head><body><aside class="preview-note">Local design preview · ${fixture==='five'?'5-card layout test':fixture==='export'?'Exported video links':'Live setup video + tutorial placeholder'} · <a href="/?fixture=five">5 tutorials</a> · <a href="/?fixture=export">Export data</a> · <a href="/">Default</a></aside><header class="preview-header"><a href="/">oora</a><span>Home &nbsp; Shop TapNest &nbsp; NFC Shortcuts &nbsp; Our Story</span></header><main>${body}</main><footer class="preview-footer">oora living &nbsp; — &nbsp; Elevating your Daily Rituals.</footer></body></html>`;
}
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:8097');
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await renderPage(url));return;}
    if(!/^\/(assets|preview)\/[a-zA-Z0-9._-]+$/.test(url.pathname)){res.writeHead(404).end();return;}
    const file=path.join(root,url.pathname);
    const type={'.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.webp':'image/webp'}[path.extname(file)]||'text/plain';
    res.setHeader('Content-Type',type);res.end(await fs.readFile(file));
  }catch(error){console.error(error);res.writeHead(500,{'Content-Type':'text/plain'}).end(error.message);}
}).listen(8097,'127.0.0.1',()=>console.log('Local NFC preview: http://127.0.0.1:8097'));
