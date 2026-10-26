#!/usr/bin/env python3
"""Генератор раздела статей VASSKASS • FLOW: stati/<slug>.html и stati/index.html.

Тексты лежат в tools/articles/<slug>.md. Формат файла:

    ---
    title: <title страницы>
    description: <meta description>
    h1: <заголовок>
    group: <раздел каталога>
    order: <число для сортировки в каталоге>
    date: 2026-10-25          (дата публикации)
    updated: 2026-10-25       (дата обновления, по умолчанию = date)
    related: slug1, slug2, slug3
    ---
    Текст в упрощённом Markdown.

Поддерживается: абзацы, ## и ### заголовки, списки «- » и «1. », таблицы с «|»,
врезки «> », **жирный**, [текст](ссылка) (путь относительно stati/),
а также подстановки из базы продуктов index.html:
    [[slug]] / [[slug|текст]] — ссылка на страницу калорийности;
    {{k:slug}} — ккал на 100 г; {{k:slug:200}} — ккал в 200 г;
    {{p:..}} {{f:..}} {{c:..}} — белки/жиры/углеводы (г), те же формы;
    {{sum:slug:г,slug:г}} — сумма ккал; {{cta}} — кнопка «Считать калории бесплатно».
Раздел «## Вопросы и ответы» с подзаголовками ### попадает в разметку FAQPage.

Запуск из корня репозитория:  python3 tools/gen_articles.py
Скрипт проверяет ссылки, обновляет только URL раздела stati/ в sitemap.xml.
"""
import html
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen_seo as G  # noqa: E402

ROOT = G.ROOT
SRC = os.path.join(ROOT, "tools", "articles")
OUT = os.path.join(ROOT, "stati")
GROUPS = ["Основы", "Похудение", "Питание на каждый день"]

EXTRA_CSS = """
article h2{margin-top:32px}
article h3{font-size:17px;margin:20px 0 6px}
article ul,article ol{padding-left:22px}
article li{margin:4px 0}
.callout{border-left:4px solid var(--acc);background:var(--card);border-radius:0 16px 16px 0;padding:12px 14px;margin:16px 0}
.meta{font-size:13px;color:var(--mut);margin:0 0 14px}
.tw{overflow-x:auto;margin:12px 0}
.tw table{min-width:300px}
.alist{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.alist a{display:block;padding:14px;border:1px solid var(--line);border-radius:18px;background:var(--card);text-decoration:none;color:var(--txt)}
.alist a b{display:block;font-size:17px;margin-bottom:4px}
.alist a span{color:var(--mut);font-size:14px}
.alist a:hover{border-color:var(--acc)}
"""


class Ctx:
    def __init__(self, foods):
        self.by_slug = {f["slug"]: f for f in foods}
        self.errors = []

    def food(self, slug):
        f = self.by_slug.get(slug)
        if not f:
            self.errors.append("нет продукта: " + slug)
        return f


def parse_md_file(path):
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n(.*)$", raw, re.S)
    if not m:
        sys.exit("Нет front matter: " + path)
    meta = {}
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    for k in ("title", "description", "h1", "group", "date"):
        if not meta.get(k):
            sys.exit(f"{path}: нет поля {k}")
    meta.setdefault("updated", meta["date"])
    meta["slug"] = os.path.splitext(os.path.basename(path))[0]
    meta["related"] = [x.strip() for x in meta.get("related", "").split(",") if x.strip()]
    meta["order"] = int(meta.get("order", "100"))
    return meta, m.group(2)


def subst(text, ctx):
    """Подстановки из базы продуктов ({{..}} и [[..]]), до экранирования."""
    def val(kind, slug, grams):
        f = ctx.food(slug)
        if not f:
            return "?"
        kc, c, fi, p, fat = f["v"]
        g = float(grams.replace(",", ".")) if grams else 100.0
        k = g / 100
        if kind == "k":
            return G.fk(kc * k)
        return G.fnum(round({"p": p, "f": fat, "c": c}[kind] * k, 1))

    def rep(m):
        body = m.group(1)
        if body == "cta":
            return "\x00CTA\x00"
        parts = body.split(":", 1)
        if parts[0] == "sum":
            tot = 0.0
            for chunk in parts[1].split(","):
                slug, g = chunk.strip().rsplit(":", 1)
                f = ctx.food(slug)
                if f:
                    tot += f["v"][0] * float(g) / 100
            return str(int(round(tot)))
        bits = body.split(":")
        if bits[0] in ("k", "p", "f", "c") and len(bits) in (2, 3):
            return val(bits[0], bits[1], bits[2] if len(bits) == 3 else None)
        ctx.errors.append("неизвестная подстановка {{%s}}" % body)
        return "?"

    text = re.sub(r"\{\{([^}]+)\}\}", rep, text)

    def link(m):
        slug, _, label = m.group(1).partition("|")
        f = ctx.food(slug.strip())
        name = label.strip() or (G.lower_first(f["name"]) if f else slug)
        return f"[{name}](../kaloriynost/{slug.strip()}.html)"

    return re.sub(r"\[\[([^\]]+)\]\]", link, text)


def inline(s):
    s = G.esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', s)
    return s


def md_to_html(md, cta_html):
    out, faq = [], []
    lines = md.strip("\n").split("\n")
    i = 0
    in_faq = False
    cur_q = None
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1
            continue
        if ln.strip() == "\x00CTA\x00":
            out.append(cta_html)
            i += 1
            continue
        if ln.startswith("## "):
            t = ln[3:].strip()
            in_faq = t.lower().startswith("вопросы и ответы")
            out.append(f"<h2>{inline(t)}</h2>")
            i += 1
            continue
        if ln.startswith("### "):
            t = ln[4:].strip()
            out.append(f"<h3>{inline(t)}</h3>")
            if in_faq:
                cur_q = [t, ""]
                faq.append(cur_q)
            i += 1
            continue
        if ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", c) for c in cells):
                    rows.append(cells)
                i += 1
            th = "".join(f"<th>{inline(c)}</th>" for c in rows[0])
            tb = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
            out.append(f'<div class="card tw"><table><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table></div>')
            continue
        if re.match(r"^(- |\d+\. )", ln):
            ordered = bool(re.match(r"^\d+\. ", ln))
            items = []
            while i < len(lines) and re.match(r"^(- |\d+\. )", lines[i]):
                items.append(re.sub(r"^(- |\d+\. )", "", lines[i]).strip())
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>")
            continue
        if ln.startswith("> "):
            buf = []
            while i < len(lines) and lines[i].startswith("> "):
                buf.append(lines[i][2:].strip())
                i += 1
            out.append(f'<div class="callout">{inline(" ".join(buf))}</div>')
            continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r"^(#{2,3} |\||- |\d+\. |> |\x00CTA)", lines[i]):
            buf.append(lines[i].strip())
            i += 1
        para = " ".join(buf)
        out.append(f"<p>{inline(para)}</p>")
        if cur_q is not None and in_faq and not cur_q[1]:
            cur_q[1] = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", re.sub(r"\*\*", "", para))
    return "\n".join(out), [(q, a) for q, a in faq if a]


def words(md):
    t = re.sub(r"\{\{[^}]+\}\}|\[\[[^\]]+\]\]|\([^)]*\.html[^)]*\)|[#>|*\-]", " ", md)
    return len(re.findall(r"[А-Яа-яЁёA-Za-z0-9]+", t))


def date_ru(iso):
    y, m, d = iso.split("-")
    months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа",
              "сентября", "октября", "ноября", "декабря"]
    return f"{int(d)} {months[int(m) - 1]} {y}"


def article_page(meta, md, ctx, all_meta):
    slug = meta["slug"]
    path = f"stati/{slug}.html"
    cta = (f'<a class="cta" href="../?ref=seo-st-{slug}">Считать калории бесплатно'
           f'<small>Дневник питания, воды и веса — без рекламы</small></a>')
    md2 = subst(md, ctx)
    if md2.count("\x00CTA\x00") != 1:
        ctx.errors.append(f"{slug}: {{{{cta}}}} должен встречаться ровно один раз")
    body_html, faq = md_to_html(md2, cta)
    n = words(md)
    minutes = max(2, round(n / 180))
    rel = [all_meta[r] for r in meta["related"] if r in all_meta]
    for r in meta["related"]:
        if r not in all_meta:
            ctx.errors.append(f"{slug}: related на несуществующую статью {r}")
    rel_html = "".join(f'<li><a href="{r["slug"]}.html"><b>{G.esc(r["h1"])}</b><span>{G.esc(r["description"])}</span></a></li>'
                       for r in rel)
    title = f'{meta["title"]} | {G.BRAND}'
    body = f"""{G.crumbs_html([("Главная", "../"), ("Статьи", "./"), (meta["h1"], None)])}
<main><article>
<h1>{G.esc(meta["h1"])}</h1>
<p class="meta">Обновлено {date_ru(meta["updated"])} · {minutes} мин чтения</p>
{body_html}
<p class="note">Материал носит справочный характер и не заменяет консультацию врача. Детям и подросткам, беременным и кормящим, людям с хроническими заболеваниями или расстройствами пищевого поведения менять питание стоит вместе с врачом.</p>
</article>
<h2>Читайте также</h2>
<ul class="alist">{rel_html}</ul>
<p><a href="./">Все статьи</a> · <a href="../kaloriynost/">Таблица калорийности</a> · <a href="../kalkulyator-kaloriy/">Калькулятор нормы калорий</a></p>
</main>"""
    bc = [("Главная", ""), ("Статьи", "stati/"), (meta["h1"], path)]
    graph = [
        {"@type": "Article", "@id": G.SITE + path + "#article", "headline": meta["h1"][:110],
         "description": meta["description"], "inLanguage": "ru",
         "datePublished": meta["date"], "dateModified": meta["updated"],
         "image": G.SITE + "og-image.png", "wordCount": n,
         "mainEntityOfPage": {"@type": "WebPage", "@id": G.SITE + path},
         "author": {"@type": "Organization", "name": G.BRAND, "url": G.SITE},
         "publisher": {"@type": "Organization", "name": G.BRAND, "url": G.SITE,
                       "logo": {"@type": "ImageObject", "url": G.SITE + "icon-512.png"}}},
        G.crumbs_ld(bc),
    ]
    if faq:
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})
    doc = G.page(title, meta["description"], path, body, {"@context": "https://schema.org", "@graph": graph})
    doc = doc.replace("</style>", EXTRA_CSS.strip() + "</style>", 1)
    return path, doc, n, len(faq)


def index_page(metas):
    path = "stati/"
    title = f"Статьи о питании и подсчёте калорий | {G.BRAND}"
    desc = ("Понятные статьи о питании: сколько калорий нужно в день, как считать калории и БЖУ, "
            "сколько пить воды, что делать с плато и как набрать вес. Без жёстких диет.")
    secs = []
    for g in GROUPS + sorted({m["group"] for m in metas} - set(GROUPS)):
        lst = sorted([m for m in metas if m["group"] == g], key=lambda m: (m["order"], m["h1"]))
        if not lst:
            continue
        li = "".join(f'<li><a href="{m["slug"]}.html"><b>{G.esc(m["h1"])}</b><span>{G.esc(m["description"])}</span></a></li>'
                     for m in lst)
        secs.append(f"<h2>{G.esc(g)}</h2><ul class=\"alist\">{li}</ul>")
    body = f"""{G.crumbs_html([("Главная", "../"), ("Статьи", None)])}
<main>
<h1>Статьи о питании</h1>
<p class="lead">Коротко и по делу: как устроены калории, БЖУ, вода и вес. Это ориентиры, а не лечение — при заболеваниях, беременности и для детей питание подбирают с врачом.</p>
{''.join(secs)}
<a class="cta" href="../?ref=seo-st-index">Считать калории бесплатно<small>Дневник питания, воды и веса — без рекламы</small></a>
<p><a href="../kaloriynost/">Таблица калорийности продуктов</a> · <a href="../kalkulyator-kaloriy/">Калькулятор нормы калорий</a></p>
</main>"""
    bc = [("Главная", ""), ("Статьи", path)]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": G.SITE + path, "url": G.SITE + path, "name": title,
         "description": desc, "inLanguage": "ru", "isPartOf": {"@type": "WebSite", "name": G.BRAND, "url": G.SITE},
         "mainEntity": {"@type": "ItemList", "itemListElement": [
             {"@type": "ListItem", "position": i + 1, "url": G.SITE + "stati/" + m["slug"] + ".html", "name": m["h1"]}
             for i, m in enumerate(sorted(metas, key=lambda m: (GROUPS.index(m["group"]) if m["group"] in GROUPS else 99, m["order"])))]}},
        G.crumbs_ld(bc)]}
    doc = G.page(title, desc, path, body, ld, og_type="website")
    return path + "index.html", doc.replace("</style>", EXTRA_CSS.strip() + "</style>", 1)


def check_links(files):
    bad = []
    for f in files:
        s = open(f, encoding="utf-8").read()
        for m in re.findall(r'(?:href|src)="([^"]+)"', s):
            if m.startswith(("http:", "https:", "mailto:")):
                continue
            u = html.unescape(m).split("#")[0].split("?")[0]
            t = os.path.normpath(os.path.join(os.path.dirname(f), u))
            if os.path.isdir(t):
                t = os.path.join(t, "index.html")
            if not os.path.exists(t):
                bad.append((os.path.relpath(f, ROOT), m))
    return bad


def main():
    foods, _ = G.prepare_foods()
    ctx = Ctx(foods)
    metas, mds = {}, {}
    for fn in sorted(os.listdir(SRC)):
        if fn.endswith(".md"):
            meta, md = parse_md_file(os.path.join(SRC, fn))
            metas[meta["slug"]] = meta
            mds[meta["slug"]] = md
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    titles, descs, sm, written = set(), set(), [], []
    for slug, meta in metas.items():
        if meta["title"] in titles or meta["description"] in descs:
            ctx.errors.append(slug + ": неуникальный title/description")
        titles.add(meta["title"])
        descs.add(meta["description"])
        path, doc, n, nf = article_page(meta, mds[slug], ctx, metas)
        fp = os.path.join(ROOT, path)
        open(fp, "w", encoding="utf-8").write(doc)
        written.append(fp)
        sm.append((path, "monthly", "0.7", meta["updated"]))
        flag = "" if 600 <= n <= 1200 else "  <-- вне 600–1200"
        print(f"  {slug}: {n} слов, FAQ {nf}{flag}")
    p, doc = index_page(list(metas.values()))
    fp = os.path.join(ROOT, p)
    open(fp, "w", encoding="utf-8").write(doc)
    written.append(fp)
    bad = check_links(written)
    for f, m in bad:
        ctx.errors.append(f"битая ссылка в {f}: {m}")
    if ctx.errors:
        print("ОШИБКИ:\n  " + "\n  ".join(ctx.errors))
        sys.exit(1)
    total = G.update_sitemap([("stati/", "weekly", "0.8")] + sm, ("stati/",))
    print(f"Статей: {len(metas)}; страниц: {len(written)}; URL в sitemap: {total}")


if __name__ == "__main__":
    main()
