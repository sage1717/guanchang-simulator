#!/usr/bin/env python3
"""官场模拟器 · 装配脚本：source/ → dist/card.json (V3) + dist/官场模拟器.png

架构升级版（2026-08）：
- MVU 正式版运行时（去 @beta）
- 变量验证脚本内嵌化（scarlet_core.js，去 klona 远程依赖，去 apiConfig）
- 状态栏 UI 内嵌化（替换 1.2MB 远程混淆 UI）
- depth_prompt 空配置移除
- 世界书内容来自 source/worldbook/*.md（内容冻结，仅元数据可动）
"""
import json, os, sys, hashlib, base64, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source')
DST = os.path.join(ROOT, 'dist')

def read(name, base=SRC):
    with open(os.path.join(base, name), encoding='utf-8') as f:
        return f.read()

def load_json(name, base=SRC):
    return json.loads(read(name, base))

def main():
    os.makedirs(DST, exist_ok=True)
    shell = load_json('card.json')
    regex = load_json('regex.json')
    scripts = []
    for fn in sorted(os.listdir(os.path.join(SRC, 'scripts'))):
        if fn.startswith('script_') and fn.endswith('.json'):
            scripts.append(load_json(os.path.join('scripts', fn)))
    # single source of truth for script bodies:
    # 变量验证 -> scarlet_core.js, MVU -> stable bundle import
    for s in scripts:
        if s['name'] == '变量验证':
            assert s.get('content', '') == '', "script_01 wrapper content must stay empty"
            assert s.get('data', {}).get('enableExtraModelParsing') is False, "card-side extra parsing must stay disabled"
            s['content'] = read(os.path.join('scripts', 'scarlet_core.js'))
            assert "enableExtraModelParsing:a.z.boolean().default(!1)" in s['content'], "card-side extra parsing schema default must stay false"
            assert "SillyTavern.extensionSettings.mvu_settings.更新方式='额外模型解析'" in s['content'], "MVU plugin default mode must be extra-model parsing"
            assert "I.enableExtraModelParsing?(se(),ue()):ie()" in s['content'], "MVU plugin mode must be applied during initialization"
        elif s['name'] == '人物世界书自动同步':
            assert s.get('content', '') == '', "script_02 wrapper content must stay empty"
            s['content'] = read(os.path.join('scripts', 'npc_lorebook_autosync.js'))
        elif s['name'] == 'MVU':
            assert [b['name'] for b in s['button']['buttons'] if b.get('visible')] == ['重试额外模型解析'], "MVU script must expose only the retry extra-model button"
            s['content'] = "import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate/artifact/bundle.js';"
    extras = load_json('extensions_other.json')
    wb_manifest = load_json(os.path.join('worldbook', 'manifest.json'))

    # ---- statusbar regex: embed the local scarlet UI (localized; no HymnStudio remote) ----
    scarlet_html = read(os.path.join('ui', 'scarlet', 'index.html'))
    assert '```' not in scarlet_html, "fence collision in scarlet UI"
    statusbar = next(r for r in regex if r['scriptName'] == '状态栏')
    assert statusbar['replaceString'] == '__SCARLET_UI_EMBEDDED_BY_ASSEMBLER__', "statusbar source must use assembler placeholder"
    statusbar['replaceString'] = "```html\n" + scarlet_html + "\n```"
    regex = [statusbar if r['scriptName'] == '状态栏' else r for r in regex]

    # ---- worldbook entries: metadata from manifest, content from md files ----
    entries = []
    for m in wb_manifest:
        e = {k: v for k, v in m.items() if k != 'file'}
        content = read(os.path.join('worldbook', m['file']))
        # strip the "# comment" title line: file is "# comment\n\n" + original content
        if '\n\n' in content:
            e['content'] = content.split('\n\n', 1)[1]
        else:
            e['content'] = ''
        entries.append(e)
    entries.sort(key=lambda e: e['id'])

    # ---- extensions ----
    # depth_prompt 空配置冗余，移除（用户确认清理）；world 绑定保留
    extras.pop('depth_prompt', None)
    extensions = {
        'talkativeness': shell['talkativeness'],
        'fav': shell['fav'],
        'world': extras['world'],
        'tavern_helper': {'scripts': scripts, 'variables': {}},
        'regex_scripts': regex,
    }

    data = {
        'name': shell['name'],
        'description': shell['description'],
        'personality': shell['personality'],
        'scenario': shell['scenario'],
        'first_mes': shell['first_mes'],
        'mes_example': shell['mes_example'],
        'creator_notes': shell['creator_notes'],
        'system_prompt': shell['system_prompt'],
        'post_history_instructions': shell['post_history_instructions'],
        'alternate_greetings': shell['alternate_greetings'],
        'tags': shell['tags'],
        'creator': shell['creator'],
        'character_version': shell['character_version'],
        'extensions': extensions,
        'character_book': {'entries': entries, 'name': shell['name']},
    }

    card = {
        'avatar': 'none',
        'create_date': shell['create_date'],
        'creatorcomment': shell['creatorcomment'],
        'data': data,
        'description': shell['description'],
        'fav': shell['fav'],
        'first_mes': shell['first_mes'],
        'mes_example': shell['mes_example'],
        'name': shell['name'],
        'personality': shell['personality'],
        'scenario': shell['scenario'],
        'spec': 'chara_card_v3',
        'spec_version': '3.0',
        'tags': shell['tags'],
        'talkativeness': shell['talkativeness'],
    }

    out_json = os.path.join(DST, 'card.json')
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(card, f, ensure_ascii=False)
    print(f"[OK] {out_json}  {os.path.getsize(out_json)} bytes")

    # ---- validation ----
    checks = []
    checks.append(('spec v3', card['spec'] == 'chara_card_v3'))
    checks.append(('entries=42', len(entries) == 42))
    checks.append(('scripts=3', len(scripts) == 3))
    checks.append(('regex=6', len(regex) == 6))
    checks.append(('no apiConfig', all('apiConfig' not in s.get('data', {}) for s in scripts)))
    checks.append(('no klona', all('klona' not in s['content'] for s in scripts)))
    checks.append(('no @beta', all('@beta' not in s['content'] for s in scripts)))
    checks.append(('no depth_prompt', 'depth_prompt' not in extensions))
    checks.append(('ui embedded scarlet (localized)', 'HymnStudio' not in regex[1]['replaceString'] and regex[1]['replaceString'].startswith('```html')))
    checks.append(('script_01 injected from scarlet_core.js', next(s for s in scripts if s['name'] == '变量验证')['content'] == read(os.path.join('scripts', 'scarlet_core.js'))))
    checks.append(('script_02 injected from npc_lorebook_autosync.js', next(s for s in scripts if s['name'] == '人物世界书自动同步')['content'] == read(os.path.join('scripts', 'npc_lorebook_autosync.js'))))
    checks.append(('statusbar placeholder consumed', '__SCARLET_UI_EMBEDDED_BY_ASSEMBLER__' not in statusbar['replaceString']))
    checks.append(('world kept', extensions.get('world') == '官场模拟器'))
    checks.append(('first_mes kept', card['first_mes'] == '[初始化完成]\r\n<StatusPlaceHolderImpl/>'))
    for name, ok in checks:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    if not all(ok for _, ok in checks):
        sys.exit(1)

    # ---- PNG embedding (keep original image shell) ----
    png_src = os.path.join(ROOT, '官场模拟器.png')
    if os.path.exists(png_src):
        out_png = os.path.join(DST, '官场模拟器.png')
        with open(png_src, 'rb') as f:
            png = f.read()
        payload = base64.b64encode(json.dumps(card, ensure_ascii=False).encode('utf-8')).decode('ascii')

        # rebuild PNG: drop old tEXt card chunks, insert fresh chara + ccv3 before IEND
        def chunks(data):
            pos, out = 8, []
            while pos < len(data):
                length = struct.unpack('>I', data[pos:pos+4])[0]
                ctype = data[pos+4:pos+8].decode('latin1')
                out.append((ctype, data[pos+8:pos+8+length]))
                pos += 12 + length
                if ctype == 'IEND':
                    break
            return out

        def crc32(data):
            return zlib.crc32(data) & 0xffffffff

        import zlib
        cs = chunks(png)
        new_chunks = []
        for ctype, cdata in cs:
            if ctype == 'tEXt':
                # skip old card payload chunks
                key = cdata.split(b'\x00', 1)[0].decode('latin1')
                if key in ('chara', 'ccv3'):
                    continue
            new_chunks.append((ctype, cdata))

        def tEXt(key, val):
            body = key.encode('latin1') + b'\x00' + val.encode('utf-8')
            return struct.pack('>I', len(body)) + b'tEXt' + body + struct.pack('>I', crc32(b'tEXt' + body))

        out = png[:8]
        for ctype, cdata in new_chunks:
            if ctype == 'IEND':
                # insert card payloads before IEND
                out += tEXt('chara', payload)
                out += tEXt('ccv3', payload)
                out += struct.pack('>I', 0) + b'IEND' + struct.pack('>I', crc32(b'IEND'))
            else:
                out += struct.pack('>I', len(cdata)) + ctype.encode('latin1') + cdata + struct.pack('>I', crc32(ctype.encode('latin1') + cdata))
        with open(out_png, 'wb') as f:
            f.write(out)
        print(f"[OK] {out_png}  {len(out)} bytes")

        # verify roundtrip: decode both payloads and compare to card.json
        with open(out_png, 'rb') as f:
            data2 = f.read()
        pos, found = 8, {}
        while pos < len(data2):
            length = struct.unpack('>I', data2[pos:pos+4])[0]
            ctype = data2[pos+4:pos+8].decode('latin1')
            if ctype == 'tEXt':
                chunk = data2[pos+8:pos+8+length]
                nul = chunk.index(b'\x00')
                key = chunk[:nul].decode('latin1')
                if key in ('chara', 'ccv3'):
                    found[key] = json.loads(base64.b64decode(chunk[nul+1:]))
            pos += 12 + length
            if ctype == 'IEND':
                break
        assert found.get('chara') == card, "chara roundtrip mismatch"
        assert found.get('ccv3') == card, "ccv3 roundtrip mismatch"
        print("[PASS] PNG payload roundtrip: chara & ccv3 == card.json")

    print("\n装配完成。")

if __name__ == '__main__':
    main()
