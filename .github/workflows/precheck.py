# -*- coding: utf-8 -*-
"""
v6 Pre-commit 检查脚本 v3
升级：精确到函数级的重复声明检查
"""
import sys, os, re

def check_file(path):
    if not os.path.exists(path):
        print('ERROR: File not found: ' + path); return False

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    script_start = content.find('<script>')
    script_end   = content.find('</script>', script_start)
    js = content[script_start+8:script_end] if script_start >= 0 else content

    print('=' * 52)
    print('v6 Pre-commit Check v3')
    print('=' * 52)

    errors   = []
    warnings = []

    # ================================================================
    # 1. 括号平衡
    # ================================================================
    brackets = {'(': 0, ')': 0, '{': 0, '}': 0, '[': 0, ']': 0}
    for ch in js:
        if ch in brackets: brackets[ch] += 1
    print('\n[1] 括号平衡:')
    for name, (a, b) in [('圆括号', ('(', ')')), ('花括号', ('{', '}')), ('方括号', ('[', ']'))]:
        ok = brackets[a] == brackets[b]
        if not ok: errors.append('%s不匹配: %d vs %d' % (name, brackets[a], brackets[b]))
        print('  %s: %d/%d [%s]' % (name, brackets[a], brackets[b], 'OK' if ok else 'ERROR'))

    # ================================================================
    # 2. FSD模块
    # ================================================================
    print('\n[2] FSD模块:')
    for mod in ['CONFIG','Utils','CityEntity','FileUploadFeature','SummaryCardsWidget','CityTableWidget','App']:
        ok = 'const ' + mod + ' = (function' in js
        if not ok: errors.append('Module missing: ' + mod)
        print('  %s: [%s]' % (mod, 'OK' if ok else 'MISSING'))

    # ================================================================
    # 3. 函数级重复声明检查（核心升级）
    # ================================================================
    print('\n[3] 变量重复声明（函数级）:')

    # 策略：找到每个函数体的 { ... } 边界，在每个函数体内分别计数
    # 只检查 var/let/const 在同一函数体内重复声明

    def parse_function_scopes(code):
        """返回 [(scope_name, start_pos, end_pos)] 列表"""
        scopes = []
        # 找所有顶级函数定义
        func_pattern = re.compile(r'\bfunction\s+(\w+)\s*\(')
        for m in func_pattern.finditer(code):
            name = m.group(1)
            start = m.start()
            # 找函数体 { }
            depth = 0
            func_start = code.find('{', start)
            if func_start < 0: continue
            pos = func_start
            while pos < len(code):
                ch = code[pos]
                if ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        scopes.append((name, start, pos+1))
                        break
                pos += 1
        return scopes

    def get_scope_decls(code, start, end):
        """获取指定代码区域内的 var/let/const 声明"""
        block = code[start:end]
        decls = []
        # 找所有声明，但跳过 return { ... } 里的属性
        pos = 0
        while pos < len(block):
            # 找 return { ... } 块，跳过
            if block[pos:pos+7] == 'return ':
                rp = block.find('{', pos)
                if rp >= 0:
                    depth = 0
                    rpos = rp
                    while rpos < len(block):
                        if block[rpos] == '{': depth += 1
                        elif block[rpos] == '}':
                            depth -= 1
                            if depth == 0:
                                pos = rpos + 1
                                break
                        rpos += 1
                    else:
                        pos += 1
                    continue
            # 普通声明
            m = re.match(r'\b(var|let|const)\s+(\w+)\s*=', block[pos:])
            if m:
                decls.append(m.group(2))
                pos += m.start() + len(m.group(0))
            else:
                pos += 1
        return decls

    # 收集所有函数scope内的声明
    scope_decls = {}
    for func_name, f_start, f_end in parse_function_scopes(js):
        decls = get_scope_decls(js, f_start, f_end)
        for d in decls:
            key = func_name + '::' + d
            scope_decls[key] = scope_decls.get(key, 0) + 1

    # 检查顶层（script标签内但在任何函数外）
    # 找到第一个function位置，之前的就是顶层
    first_func = len(js)
    for m in re.finditer(r'\bfunction\s+\w+\s*\(', js):
        if m.start() < first_func: first_func = m.start()

    top_decls = get_scope_decls(js, 0, first_func)
    for d in top_decls:
        key = '顶层::' + d
        scope_decls[key] = scope_decls.get(key, 0) + 1

    # 报告
    has_real_dup = False
    for key, count in sorted(scope_decls.items()):
        if count > 1:
            # 过滤：某些全局变量（如i, x）在循环中重复声明是正常的
            func, name = key.split('::', 1)
            # 短变量名（i, j, k, x, y, s, v, m）通常是循环变量，不报错
            if name in ('i','j','k','x','y','s','v','m','r','n'):
                print('  [OK] %s::%s (%d次，循环变量，允许)' % (func, name, count))
            else:
                print('  ERROR: %s::%s (%d次)' % (func, name, count))
                errors.append('重复声明: %s in %s' % (name, func))
                has_real_dup = True

    if not has_real_dup:
        print('  无真正的重复声明')

    # ================================================================
    # 4-7 同v2
    # ================================================================
    print('\n[4] 启动入口:')
    for item, ok in [
        ('DOMContentLoaded', "addEventListener('DOMContentLoaded'" in js or 'addEventListener("DOMContentLoaded"' in js),
        ('App.init()', 'App.init()' in js)
    ]:
        if not ok: errors.append('Startup missing: ' + item)
        print('  %s: [%s]' % (item, 'OK' if ok else 'MISSING'))

    print('\n[5] 错误处理:')
    for item, ok in [('try-catch', 'try {' in js and 'catch' in js), ('showToast', 'Utils.showToast' in js)]:
        print('  %s: [%s]' % (item, 'OK' if ok else 'WARN'))
    if not ('Utils.showToast' in js): warnings.append('showToast not called')

    print('\n[6] 关键路径:')
    for pattern, desc in [
        ('SCORE_CONFIG', '评分配置'), ('calculateOverallHealth', '健康度'),
        ('renderCircle', '圆环'), ('XLSX.read', 'Excel解析'), ('parseCitiesFromSheet', '城市解析'),
    ]:
        ok = pattern in js
        if not ok: errors.append('Key missing: ' + desc)
        print('  %s [%s]: [%s]' % (pattern, desc, 'OK' if ok else 'MISSING'))

    print('\n[7] HTML结构:')
    for pattern, desc in [
        ('id="fileInput"', 'fileInput'), ('id="uploadArea"', 'uploadArea'),
        ('id="dynamicContent"', 'dynamicContent'), ('id="toast"', 'toast'),
        ('class="health-header"', '健康度头部'),
    ]:
        ok = pattern in content
        if not ok: errors.append('HTML missing: ' + desc)
        print('  %s [%s]: [%s]' % (pattern, desc, 'OK' if ok else 'MISSING'))

    # ================================================================
    # 结果
    # ================================================================
    print('\n' + '=' * 52)
    if errors:
        print('RESULT: %d ERRORS' % len(errors))
        for e in errors: print('  ERROR: ' + e)
    else:
        print('RESULT: PASSED - All checks OK')
    if warnings:
        print('%d warnings:' % len(warnings))
        for w in warnings: print('  WARN: ' + w)
    print('=' * 52)
    return len(errors) == 0

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'index.html')
    ok = check_file(path)
    sys.exit(0 if ok else 1)
