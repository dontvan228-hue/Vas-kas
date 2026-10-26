#!/usr/bin/env python3
"""Генератор статических SEO-страниц VASSKASS • FLOW.

Читает базу продуктов из index.html (FDB0, LC и дополнительные списки,
которые приложение подмешивает в FDB) и создаёт:
  kaloriynost/<slug>.html      — страница продукта
  kaloriynost/index.html       — каталог
  kalkulyator-kaloriy/index.html — калькулятор нормы калорий
  sitemap.xml                  — все URL

Запуск из корня репозитория:  python3 tools/gen_seo.py
Только стандартная библиотека Python 3.
"""
import datetime
import html
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://dontvan228-hue.github.io/Vas-kas/"
BRAND = "VASSKASS • FLOW"
TODAY = datetime.date.today().isoformat()

# ---------------------------------------------------------------- данные ----

# Брендовые позиции не публикуем: данные «примерные», а товарные знаки чужие.
SKIP = {
    "coca-cola", "coca-cola zero", "pepsi", "pepsi max без сахара", "добрый кола",
    "добрый кола без сахара", "черноголовка кола", "cool cola", "fanta апельсин",
    "sprite", "добрый лимон-лайм", "добрый апельсин", "лимонад крем-сода черноголовка",
    "fresh bar лимонад", "schweppes тоник", "липтон ice tea лимон",
    "липтон ice tea без сахара", "холодный чай fuse tea", "вода bonaqua",
    "вода святой источник", "red bull", "red bull без сахара", "adrenaline rush",
    "adrenaline rush без сахара", "burn", "burn без сахара", "monster energy",
    "monster energy ultra без сахара", "flash up energy", "gorilla energy",
    "tornado energy", "drive me", "сок добрый яблочный", "сок добрый апельсиновый",
    "сок rich томатный", "нектар фруктовый сад", "сок j7 мультифрукт",
    "морс fruit garden", "квас очаково", "квас никола", "сникерс батончик",
    "марс батончик", "твикс", "киндер шоколад", "kitkat", "bounty", "milky way",
    "рафаэлло", "ферреро роше", "печенье oreo", "печенье юбилейное", "чокопай",
    "чебупицца", "чебупели", "катаклизм энергетик персик (примерно)",
    "катаклизм энергетик без сахара (примерно)",
    # служебные / дублирующие по смыслу
    "вода питьевая негазированная", "вода газированная минеральная",
    "чай с сахаром (2 ч.л.)",
}

# Синонимы: вариант -> основное название (берём одну страницу на продукт).
ALIAS = {
    "яйцо куриное": "Яйцо куриное варёное",
    "сливочное масло": "Масло сливочное 82%",
    "масло сливочное 82.5%": "Масло сливочное 82%",
    "оливковое масло": "Масло оливковое",
    "бекон жареный": "Бекон",
    "куриная грудка": "Куриная грудка варёная",
    "куриное бедро": "Куриное бедро жареное",
    "говядина стейк": "Стейк говяжий жареный",
    "фарш говяжий 20%": "Фарш говяжий сырой",
    "свинина": "Свинина постная варёная",
    "лосось": "Лосось сырой",
    "тунец консервированный": "Тунец консервированный в соку",
    "креветки": "Креветки варёные",
    "брокколи": "Брокколи сырая",
    "капуста цветная": "Цветная капуста",
    "капуста белая": "Капуста белокочанная",
    "шампиньоны сырые": "Грибы шампиньоны",
    "шампиньоны жареные": "Грибы шампиньоны жареные",
    "кофе чёрный": "Кофе чёрный без сахара",
    "кофе американо": "Кофе чёрный без сахара",
    "рис варёный": "Рис белый варёный",
    "рикотта": "Сыр рикотта",
    "огурцы солёные": "Огурец солёный",
    "финики сушёные": "Финики",
    "хлеб ржаной": "Хлеб чёрный (ржаной)",
    "пицца маргарита (кусок)": "Пицца Маргарита",
    "сырники": "Сырники жареные",
    "яблочный сок": "Сок яблочный",
    "апельсиновый сок": "Сок апельсиновый",
    "пиво светлое": "Пиво",
    "сало солёное": "Сало",
    "сосиски варёные": "Сосиски",
    "колбаса варёная докторская": "Колбаса докторская",
    "картофель отварной": "Картофель варёный",
    "батон нарезной": "Батон",
    "сгущённое молоко": "Сгущёнка",
    "халва подсолнечная": "Халва",
    "шоколадные конфеты": "Конфеты шоколадные",
    "куриные наггетсы": "Наггетсы куриные",
    "селёдка под шубой": "Сельдь под шубой",
    "греческий салат": "Салат греческий",
    "салат из капусты с маслом": "Салат капустный с маслом",
    "рисовая каша на молоке": "Каша рисовая на молоке",
    "овсянка на молоке": "Каша овсяная на молоке",
    "творог обезжиренный 0%": "Творог 0%",
    "горошек зелёный консервированный": "Зелёный горошек консервированный",
    "оливки консервированные": "Оливки",
    "кукуруза консервированная сладкая": "Кукуруза консервированная",
    "укроп и петрушка (зелень)": "Зелень (укроп, петрушка)",
    "сельдерей стебель": "Сельдерей",
    "суп харчо": "Харчо",
    "уха из рыбы": "Уха",
    "гороховый суп с копчёностями": "Суп гороховый",
    "гуляш говяжий с подливой": "Гуляш говяжий",
    "компот домашний": "Компот",
    "простокваша 2.5%": "Простокваша",
    "кола": "Газировка сладкая",
    "кабачки жареные": "Кабачок жареный",
    "котлета говяжья жареная": "Котлеты домашние жареные",
}

# Переименование для понятности (значения те же).
RENAME = {
    "Йогурт греческий": "Йогурт греческий 5%",
    "Тёмный шоколад 85%": "Шоколад горький 85%",
    "Чай с сахаром (1 ложка)": "Чай с сахаром",
}

# Явно ошибочные значения: заменяем вариантом из другого списка или правкой.
# name_lower -> (kcal, carbs, fiber, protein, fat) — по справочным данным.
FIX = {
    # FDB0: 127 ккал/31 г углеводов — так у сушёной/особых сортов; у свежей
    # хурмы около 67–70 ккал. Во втором списке приложения уже 70.
    "хурма": (70.0, 18.0, 3.6, 0.6, 0.2),
}


def parse_js_literal(s, i):
    """Минимальный парсер JS-литерала (массивы, строки, числа) с позиции i."""
    num = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")

    def ws(j):
        while s[j] in " \t\r\n":
            j += 1
        return j

    def val(j):
        j = ws(j)
        c = s[j]
        if c == "[":
            out = []
            j += 1
            while True:
                j = ws(j)
                if s[j] == "]":
                    return out, j + 1
                v, j = val(j)
                out.append(v)
                j = ws(j)
                if s[j] == ",":
                    j += 1
                elif s[j] == "]":
                    return out, j + 1
                else:
                    raise ValueError("Неожиданный символ: " + s[j - 30:j + 30])
        if c in "\"'":
            k = j + 1
            buf = []
            while s[k] != c:
                if s[k] == "\\":
                    buf.append(s[k + 1])
                    k += 2
                else:
                    buf.append(s[k])
                    k += 1
            return "".join(buf), k + 1
        m = num.match(s, j)
        if m:
            return float(m.group()), m.end()
        raise ValueError("Не разобрать: " + s[j:j + 40])

    return val(i)


def load_portions():
    """Бытовые порции из js/portions-data.js (если файл есть): {name_norm: [(подпись, г)]}."""
    fp = os.path.join(ROOT, "js", "portions-data.js")
    out = {}
    if not os.path.exists(fp):
        return out
    s = open(fp, encoding="utf-8").read()
    for m in re.finditer(r"^\s*(['\"])(.+?)\1\s*:\s*\[\[", s, re.M):
        try:
            arr, _ = parse_js_literal(s, m.end() - 2)
        except ValueError:
            continue
        rows = [(str(x[0]), float(x[1])) for x in arr
                if isinstance(x, list) and len(x) >= 2 and isinstance(x[1], float) and 0 < x[1] <= 2000]
        if rows:
            out[norm(m.group(2))] = rows
    return out


def norm(n):
    return n.strip().lower().replace("ё", "е")


def load_foods(src):
    """Извлекает списки продуктов в том же порядке, в каком их собирает FDB."""
    lists = []
    pat = re.compile(r"(const (FDB0|LC)=|ex=new (?:Map|Set)\(FDB\.map[^;]*;(?:const DISH=)?)\[\[")
    for m in pat.finditer(src):
        arr, _ = parse_js_literal(src, m.end() - 2)
        name = m.group(2) or "доп. список (строка %d)" % (src.count("\n", 0, m.start()) + 1)
        lists.append((name, arr))
    order = {"FDB0": 0, "LC": 1}
    lists.sort(key=lambda t: order.get(t[0], 2))  # как FDB0.concat(LC), затем добавки
    if not any(n == "FDB0" for n, _ in lists):
        sys.exit("FDB0 не найден в index.html")
    return lists


def build_db(lists, log):
    skip_n = {norm(x) for x in SKIP}
    alias_n = {norm(k): v for k, v in ALIAS.items()}
    items = {}   # key -> dict
    order = []
    for src_name, arr in lists:
        for row in arr:
            if not isinstance(row, list) or len(row) < 6 or not isinstance(row[0], str):
                continue
            raw = row[0].strip()
            k0 = norm(raw)
            if k0 in skip_n:
                log["skipped"].add(raw)
                continue
            name = alias_n.get(k0, raw)
            k = norm(name)
            vals = [float(v) for v in row[1:6]]
            por = float(row[6]) if len(row) > 6 and row[6] else 0.0
            if k not in items:
                items[k] = {"name": name, "v": vals, "por": por, "src": [src_name], "alts": []}
                order.append(k)
                continue
            it = items[k]
            it["src"].append(src_name)
            if por and not it["por"]:
                it["por"] = por
            # «самое полное значение»: если у основного нет клетчатки/БЖУ, а тут есть
            filled_old = sum(1 for v in it["v"][1:] if v)
            filled_new = sum(1 for v in vals[1:] if v)
            if filled_new > filled_old and abs(vals[0] - it["v"][0]) <= max(5, it["v"][0] * .1):
                it["v"] = vals
            if it["v"][0] and abs(vals[0] - it["v"][0]) / it["v"][0] > .2:
                it["alts"].append((raw, vals[0], src_name))
    out = []
    for k in order:
        it = items[k]
        if it["name"] in RENAME:
            it["name"] = RENAME[it["name"]]
        if k in FIX:
            if abs(it["v"][0] - FIX[k][0]) > .5:
                log["fixed"].append((it["name"], it["v"][0], FIX[k][0]))
            it["v"] = list(FIX[k])
        kc, c, fi, p, f = it["v"]
        if it["alts"] and k not in FIX:
            log["conflicts"].append((it["name"], kc, it["alts"]))
        alco = bool(re.search(r"пиво|вино|водка|шампанск|коньяк", k))
        est = 4 * p + 4 * c + 9 * f
        bad = (kc < 0 or p < 0 or f < 0 or c < 0 or p + f + c > 101 or kc > 905
               or (not alco and kc > 0 and abs(est - kc) > max(30, .3 * kc)))
        if bad:
            log["rejected"].append((it["name"], kc, round(est)))
            continue
        it["alco"] = alco
        out.append(it)
    return out


# ------------------------------------------------------------ категории ----

CATS = [
    ("alco", "Алкоголь", r"^(пиво|вино |водка|шампанск)"),
    ("drinks", "Напитки", r"^(кофе|чай|сок|газиров|лимонад|вода|морс|квас|компот|смузи|энергетик|какао|капучино|латте|горячий шоколад|крем-сода)"),
    ("sweets", "Сладости и десерты", r"(^мёд|^сахар|варенье|сгущ|шоколад|конфет|зефир|мармелад|халв|вафл|торт|пончик|эклер|пирожное|морожено|эскимо|лёд|леденц|ириск|пастил|чак-чак|баурсак|трюфель|коровка|козинак|пряник|сырок творожный|творожный десерт|булочка сдобная|булочка с маком|печенье)"),
    ("snacks", "Снеки", r"^(чипсы|попкорн|сухарики|семечки подсолнечные жареные)"),
    ("soups", "Супы", r"(борщ|^щи|суп|солянка|^уха|окрошка|рассольник|харчо|лагман|шурпа|мастава)"),
    ("fast", "Фастфуд и выпечка с начинкой", r"(пицц|бургер|шаурм|хот-дог|фри|наггетс|пирожок|беляш|чебурек|самса|хачапури|ролл|суши|бутерброд|сэндвич|хлеб с авокадо|лапша быстрого)"),
    ("dish", "Вторые блюда и салаты", r"(^салат (?!листовой|айсберг)|плов|голубц|фаршированн|жаркое|курица с картошкой|бефстроганов|гуляш|по-флотски|спагетти|паста |лазань|оливье|винегрет|шуб|холодец|заливн|драник|запеканк|сырник|вареник|пельмен|хинкали|манты|блин|оладь|долма|лобио|чахохбили|бешбармак|куырдак|колдуны|рис с курицей|каша гречневая с мясом|морковь по-корейски|грибы жареные с картошкой|тефтел|крабовый|мимоза|яичница из|творожная масса|котлет|шашлык|люля)"),
    ("grains", "Крупы, каши и макароны", r"(овсян|овсяные|гречк|^рис|макарон|пшён|перлов|булгур|кускус|манн|киноа|мюсли|хлопья|каша)"),
    ("dairy", "Молочные продукты и сыры", r"(молок|кефир|ряженк|простокваш|йогурт|творог|сметан|сливк|^сыр|брынз|масло сливочное|айран|катык|кумыс|сыворотк)"),
    ("eggs", "Яйца", r"(яйц|яичн|омлет|желток|белок яичный)"),
    ("fish", "Рыба и морепродукты", r"(лосос|форел|сёмг|треск|минтай|^хек|судак|тунец|сельд(?!ер)|скумбри|кревет|кальмар|мидии|краб|икра|шпрот|горбуш|кильк|сайр)"),
    ("meat", "Мясо и птица", r"(кури|индейк|утка|говяд|стейк|фарш|свин|бекон|баранин|печень|язык|колбас|сосиск|сардельк|ветчин|^сало|тушёнк|казы)"),
    ("bread", "Хлеб и выпечка", r"(хлеб|батон|лаваш|тост|лепёшк|сухари|сушки|круассан)"),
    ("legumes", "Бобовые и тофу", r"(^горох|фасоль(?! стручк)|чечевиц|^нут|хумус|тофу)"),
    ("veg", "Овощи, грибы и зелень", r"(картоф|батат|морков|свёкл|капуст|брокколи|кабач|цукини|баклажан|огур|помидор|перец|^лук|чеснок|тыкв|редис|сельдер|шпинат|салат|руккол|зелень|гриб|шампиньон|спарж|горош|фасоль стручк|овощн|кукуруз)"),
    ("fruit", "Фрукты, ягоды и сухофрукты", r"(яблок|груш|банан|апельсин|мандарин|грейпфрут|лимон|киви|виноград|персик|нектарин|^слива|абрикос|арбуз|дын|ананас|манго|гранат|хурм|клубник|малин|черник|смородин|вишн|черешн|инжир|изюм|кураг|финик|чернослив|авокадо|оливки)"),
    ("nuts", "Орехи и семена", r"(миндал|орех|фундук|кешью|арахис|фисташ|семечк|семена)"),
    ("oils", "Масла и соусы", r"(масло|маргарин|майонез|кетчуп|соус|горчиц|томатная паста)"),
]
CAT_NAME = {c[0]: c[1] for c in CATS}
DISPLAY_ORDER = ["grains", "meat", "fish", "dairy", "eggs", "veg", "fruit", "legumes", "nuts", "bread",
                 "dish", "soups", "fast", "sweets", "snacks", "drinks", "oils", "alco", "other"]
CAT_NAME["other"] = "Другое"

CAT_NOTE = {
    "alco": "Почти все калории в алкогольных напитках даёт этиловый спирт — около 7 ккал на 1 г, поэтому сумма белков, жиров и углеводов здесь не объясняет калорийность. Для подсчёта 100 г напитка можно считать примерно равными 100 мл.",
    "drinks": "Калории в напитках легко пропустить: стакан не ощущается как еда. Для подсчёта 100 г напитка можно считать примерно равными 100 мл. Если добавляете сахар, сироп или молоко, записывайте их отдельно.",
    "sweets": "Калорийность сладостей сильно зависит от рецепта и производителя, поэтому для покупного продукта точнее взять цифры с этикетки. Небольшие кусочки удобнее взвешивать: на глаз легко ошибиться в полтора-два раза.",
    "snacks": "Снеки калорийные и легко съедаются незаметно. Удобнее отсыпать порцию в тарелку и взвесить, чем есть из пачки. Для конкретной марки сверьтесь с этикеткой.",
    "soups": "Калорийность супа зависит от рецепта: жирности бульона, количества мяса, сметаны или зажарки. Здесь указано среднее значение для порции без добавок. Сметану, хлеб и майонез записывайте отдельно.",
    "fast": "Значения усреднённые: у разных заведений и производителей рецепты отличаются. Если есть данные на упаковке или в меню, используйте их — так подсчёт будет точнее.",
    "dish": "Это усреднённое значение для типичного домашнего рецепта. Если готовите сами, точнее посчитать блюдо по ингредиентам: в приложении есть конструктор рецептов, который сам пересчитает калорийность на 100 г и на порцию.",
    "dairy": "У молочных продуктов калорийность в основном определяет жирность, поэтому сверяйте процент на упаковке и выбирайте в дневнике вариант с той же жирностью.",
    "eggs": "Одно куриное яйцо категории С1 без скорлупы весит около 50–55 г. Если жарите на масле, масло добавляйте в дневник отдельно.",
    "fish": "Калорийность рыбы зависит от вида, жирности и способа приготовления. Жарка в масле и панировка заметно добавляют калорий, а запекание и варка почти не меняют их.",
    "meat": "На калорийность мяса сильнее всего влияет жирность куска и способ приготовления. При варке и запекании продукт теряет воду, поэтому 100 г готового мяса калорийнее, чем 100 г сырого. Взвешивайте продукт в том же виде, в каком записываете.",
    "grains": "Сухая и готовая крупа отличаются по калорийности в 2–3 раза: при варке крупа впитывает воду. Главное — взвешивать и записывать в одном и том же виде: либо сухую, либо готовую.",
    "bread": "Один стандартный кусок хлеба весит 25–35 г. Калорийность разных сортов отличается не так сильно, как кажется: больше влияет количество.",
    "legumes": "Бобовые богаты белком и клетчаткой. Сухие и варёные бобовые отличаются по калорийности примерно в 2,5 раза, поэтому выбирайте в дневнике правильный вариант.",
    "veg": "Сами овощи низкокалорийны, основную разницу дают масло, сметана и соусы при готовке. Их удобнее записывать отдельной строкой.",
    "fruit": "Калорийность фруктов зависит от сорта и спелости. Сухофрукты в 4–5 раз калорийнее свежих фруктов того же веса, потому что из них ушла вода.",
    "nuts": "Орехи и семена очень калорийны: горсть — это 30–40 г, то есть 170–250 ккал. Их удобно взвешивать заранее и записывать порцию целиком.",
    "oils": "Масла и соусы почти целиком состоят из жира, поэтому даже ложка заметно добавляет калорий. В столовой ложке растительного масла около 17 г, в чайной — около 5 г.",
    "other": "Значения средние. Для покупного продукта сверяйтесь с этикеткой.",
}


def category(name):
    n = name.lower()
    for cid, _, rx in CATS:
        if re.search(rx, n):
            return cid
    return "other"


# ------------------------------------------------------------- slug --------

TR = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
              ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o",
               "p", "r", "s", "t", "u", "f", "kh", "ts", "ch", "sh", "shch", "", "y", "", "e",
               "yu", "ya"]))


def slugify(name):
    s = name.lower()
    s = re.sub(r"(\d)[.,](\d)", r"\1-\2", s)
    s = s.replace("%", "")
    s = "".join(TR.get(ch, ch) for ch in s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


# ------------------------------------------------------------ format -------

def fnum(v, dec=1):
    if abs(v - round(v)) < 1e-9:
        return str(int(round(v)))
    return ("%.*f" % (dec, v)).rstrip("0").rstrip(".").replace(".", ",")


def fk(v):
    """Калории: целые, а меньше 10 — с одной десятой."""
    if v < 10:
        return fnum(round(v, 1))
    return str(int(round(v)))


def esc(s):
    return html.escape(s, quote=True)


def lower_first(s):
    return s[:1].lower() + s[1:] if s and not (len(s) > 1 and s[1].isupper()) else s


# --------------------------------------------------------------- CSS -------

CSS = """
:root{--bg:#0a1222;--bg2:#13233d;--card:rgba(255,255,255,.06);--card2:rgba(255,255,255,.1);--line:rgba(180,220,255,.22);--txt:#eaf4ff;--mut:rgba(200,220,245,.7);--acc:#5ef08a;--acc2:#3fc6ff;--on:#05210f;--link:#7ff5a3;--warn:#ff8a8a;color-scheme:dark}
@media (prefers-color-scheme:light){:root{--bg:#f3f7fc;--bg2:#e3edf8;--card:#fff;--card2:#f4f8fc;--line:rgba(20,50,90,.14);--txt:#0d1b2e;--mut:#4b5d75;--acc:#5ef08a;--acc2:#0b84c6;--on:#05210f;--link:#0a7a3b;--warn:#b3261e;color-scheme:light}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);background-image:radial-gradient(900px 500px at 10% -10%,var(--bg2),transparent 70%);background-attachment:fixed;color:var(--txt);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
a{color:var(--link)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px 40px}
header.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);margin-bottom:8px}
.logo{display:flex;align-items:center;gap:10px;color:var(--txt);text-decoration:none;font-weight:700;letter-spacing:.5px;font-size:15px}
.logo img{width:32px;height:32px;border-radius:9px}
.top nav a{color:var(--mut);text-decoration:none;font-size:14px;margin-left:12px}
.top nav a:hover{color:var(--txt)}
.crumbs{font-size:13px;color:var(--mut);margin:12px 0 4px;overflow-wrap:anywhere}
.crumbs a{color:var(--mut)}
h1{font-size:clamp(24px,6vw,34px);line-height:1.2;margin:8px 0 10px}
h2{font-size:20px;margin:28px 0 10px}
.lead{color:var(--mut);margin:0 0 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:16px;margin:14px 0;box-shadow:0 14px 34px -24px rgba(0,0,0,.6)}
.big{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;text-align:center}
.big div{background:var(--card2);border:1px solid var(--line);border-radius:16px;padding:10px 4px}
.big b{display:block;font-size:22px;font-variant-numeric:tabular-nums}
.big small{color:var(--mut);font-size:12px}
.big .k b{color:var(--acc)}
@media (prefers-color-scheme:light){.big .k b{color:#0a7a3b}}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
th,td{padding:9px 6px;border-bottom:1px solid var(--line);text-align:right}
th:first-child,td:first-child{text-align:left}
th{font-size:13px;color:var(--mut);font-weight:600}
.cta{display:block;text-align:center;background:var(--acc);color:var(--on);font-weight:700;font-size:18px;text-decoration:none;padding:16px 20px;border-radius:999px;margin:22px 0;box-shadow:0 0 22px rgba(94,240,138,.4),inset 0 1px 0 rgba(255,255,255,.6)}
.cta:hover{filter:brightness(1.05)}
.cta small{display:block;font-weight:500;font-size:13px;opacity:.8}
.list{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.list li a{display:flex;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--card);text-decoration:none;color:var(--txt)}
.list li a span{color:var(--mut);white-space:nowrap;font-size:14px}
.list li a:hover{border-color:var(--acc)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
.chips a{font-size:13px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;color:var(--txt);background:var(--card)}
.note{font-size:13px;color:var(--mut)}
footer{margin-top:36px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--mut)}
footer a{color:var(--mut)}
label{display:block;font-size:14px;color:var(--mut);margin:10px 0 4px}
input,select{width:100%;font:inherit;color:var(--txt);background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:11px 12px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.seg{display:flex;gap:6px}
.seg label{flex:1;margin:0;text-align:center;padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--card2);cursor:pointer;color:var(--txt)}
.seg input{position:absolute;opacity:0;width:1px;height:1px}
.seg label:has(input:checked){border-color:var(--acc);box-shadow:0 0 0 1px var(--acc) inset}
.chk{display:flex;gap:8px;align-items:flex-start;color:var(--txt)}
.chk input{width:auto;margin-top:4px}
button.cta{width:100%;border:0;cursor:pointer;font:inherit;font-weight:700;font-size:18px}
.res b{font-size:28px;color:var(--acc)}
@media (prefers-color-scheme:light){.res b{color:#0a7a3b}}
.res .line{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
.res .line:last-child{border:0}
.warn{border-color:var(--warn)}
.letters{display:flex;flex-wrap:wrap;gap:4px}
.logo{white-space:nowrap}.top nav{white-space:nowrap}
@media (max-width:360px){.top nav a:first-child{display:none}}
@media (max-width:420px){.big{grid-template-columns:repeat(2,minmax(0,1fr))}.top nav a.hide-s{display:none}.logo{font-size:13px;gap:8px;letter-spacing:.2px}.top nav a{font-size:13px;margin-left:10px}th,td{padding:8px 3px;font-size:14px}}
"""


def page(title, desc, canon_path, body, jsonld, depth=1, og_type="article"):
    up = "../" * depth
    canon = SITE + canon_path
    ld = json.dumps(jsonld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="ru_RU">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0a1222">
<link rel="icon" type="image/png" href="{up}icon-192.png">
<link rel="apple-touch-icon" href="{up}icon-180.png">
<style>{CSS.strip()}</style>
<script type="application/ld+json">{ld}</script>
</head>
<body>
<div class="wrap">
<header class="top"><a class="logo" href="{up}"><img src="{up}icon-192.png" alt="" width="32" height="32">{BRAND}</a>
<nav><a href="{up}kaloriynost/">Калорийность</a><a href="{up}kalkulyator-kaloriy/" class="hide-s">Калькулятор</a><a href="{up}stati/">Статьи</a></nav></header>
{body}
<footer>
<p>{BRAND} — бесплатный счётчик калорий и трекер питания, воды и веса. Без рекламы.</p>
<p><a href="{up}">Открыть приложение</a> · <a href="{up}kaloriynost/">Таблица калорийности</a> · <a href="{up}kalkulyator-kaloriy/">Калькулятор нормы калорий</a> · <a href="{up}stati/">Статьи о питании</a></p>
<p>Данные о калорийности средние и приведены для справки. Информация на сайте не заменяет консультацию врача или диетолога.</p>
</footer>
</div>
</body>
</html>
"""


def crumbs_html(items):
    parts = []
    for name, href in items:
        parts.append(f'<a href="{href}">{esc(name)}</a>' if href else f"<span>{esc(name)}</span>")
    return '<nav class="crumbs" aria-label="Хлебные крошки">' + " › ".join(parts) + "</nav>"


def crumbs_ld(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u}
        for i, (n, u) in enumerate(items)]}


# ----------------------------------------------------------- product page --

def macro_text(it):
    kc, c, fi, p, f = it["v"]
    if it["alco"] or kc < 5:
        return ""
    e = {"белки": 4 * p, "жиры": 9 * f, "углеводы": 4 * c}
    tot = sum(e.values()) or 1
    top = max(e, key=e.get)
    share = round(e[top] / tot * 100)
    if share >= 50:
        return f"Больше всего энергии в этом продукте дают {top} — около {share}% калорийности."
    parts = sorted(e.items(), key=lambda t: -t[1])
    return (f"Калорийность распределена довольно равномерно: {parts[0][0]} дают около "
            f"{round(parts[0][1] / tot * 100)}%, {parts[1][0]} — около {round(parts[1][1] / tot * 100)}%.")


def density_text(kc):
    if kc < 1:
        return "Калорий в продукте практически нет."
    if kc < 60:
        lvl = "низкая"
    elif kc < 150:
        lvl = "умеренная"
    elif kc < 300:
        lvl = "средняя"
    else:
        lvl = "высокая"
    g = 100 / kc * 100
    gtxt = f"{fnum(round(g / 10) * 10 if g >= 100 else round(g))} г" if g < 2000 else f"{fnum(round(g / 100) / 10)} кг"
    return f"Калорийность {lvl}: 100 ккал — это примерно {gtxt} продукта."


def portions(it):
    if it.get("hp"):
        rows = [(l, g) for l, g in it["hp"]]
        if not any(abs(g - 100) < .01 for _, g in rows):
            rows.insert(0, ("100 г", 100.0))
        return rows, True
    por = it["por"]
    if por:
        rows = []
        if por >= 40:
            rows.append(("½ порции", por / 2))
        rows.append(("1 порция", por))
        rows.append(("2 порции", por * 2))
        if 100 not in [r[1] for r in rows]:
            rows.insert(0, ("100 г", 100.0))
        return rows, True
    return [(f"{g} г", float(g)) for g in (50, 100, 150, 200)], False


def product_page(it, by_cat, slugs):
    name, slug, cat = it["name"], it["slug"], it["cat"]
    kc, c, fi, p, f = it["v"]
    unit = "мл" if cat in ("drinks", "alco") else "г"
    rows, real = portions(it)

    def row_html(label, g):
        k = g / 100
        lab = label if not real or label == "100 г" else f"{label} ({fnum(round(g))} {unit})"
        return (f"<tr><td>{esc(lab)}</td><td>{fk(kc * k)}</td><td>{fnum(round(p * k, 1))}</td>"
                f"<td>{fnum(round(f * k, 1))}</td><td>{fnum(round(c * k, 1))}</td></tr>")

    por_rows = "".join(row_html(l, g) for l, g in rows)
    hp_first = next((g for l, g in (it.get("hp") or []) if abs(g - 100) > .01), None)
    por_g = it["por"] or hp_first or 200.0
    por_k = kc * por_g / 100

    sims = [x for x in by_cat[cat] if x is not it]
    sims.sort(key=lambda x: abs(x["v"][0] - kc))
    sims = sims[:8]
    sims_html = "".join(
        f'<li><a href="{x["slug"]}.html">{esc(x["name"])}<span>{fk(x["v"][0])} ккал</span></a></li>' for x in sims)

    title = f"{name} — калорийность {fk(kc)} ккал на 100 г, БЖУ | {BRAND}"
    desc = (f"{name}: {fk(kc)} ккал на 100 г, белки {fnum(p)} г, жиры {fnum(f)} г, углеводы {fnum(c)} г. "
            f"{'Порция' if (it['por'] or hp_first) else 'В'} {fnum(round(por_g))} {unit} — {fk(por_k)} ккал. "
            f"Таблица БЖУ и бесплатный счётчик калорий.")
    path = f"kaloriynost/{slug}.html"
    cat_name = CAT_NAME[cat]
    bc = [("Главная", ""), ("Калорийность продуктов", "kaloriynost/"), (name, path)]
    fib = f"<tr><td>Клетчатка</td><td colspan=\"4\">{fnum(fi)} г</td></tr>" if fi else ""

    text = " ".join(t for t in (density_text(kc), macro_text(it)) if t)
    note = CAT_NOTE.get(cat, CAT_NOTE["other"])
    por_note = ("Вес бытовых порций примерный: он зависит от размера продукта." if it.get("hp") else None) or (f"Типичная порция в приложении — {fnum(round(it['por']))} {unit}, это {fk(por_k)} ккал."
                if it["por"] else "Данных о стандартной порции нет, поэтому в таблице — популярные веса.")
    ln = lower_first(name)

    faq = [
        (f"Сколько калорий в 100 г: {ln}?",
         f"В 100 г — {fk(kc)} ккал. Белки {fnum(p)} г, жиры {fnum(f)} г, углеводы {fnum(c)} г."),
        (f"Сколько калорий в порции {fnum(round(por_g))} {unit}?",
         f"Примерно {fk(por_k)} ккал. Белки {fnum(round(p * por_g / 100, 1))} г, жиры {fnum(round(f * por_g / 100, 1))} г, углеводы {fnum(round(c * por_g / 100, 1))} г."),
    ]
    faq_html = "".join(f"<h3>{esc(q)}</h3><p>{esc(a)}</p>" for q, a in faq)
    body = f"""{crumbs_html([(n, "../" + u if u else "../") for n, u in bc[:-1]] + [(name, None)])}
<main>
<h1>{esc(name)}: калорийность и БЖУ на 100 г</h1>
<p class="lead">Категория: <a href="./#{cat}">{esc(cat_name)}</a>. Средние значения для продукта{' в готовом виде' if re.search('варён|жарен|запечён|тушён', name.lower()) else ''}.</p>
<section class="card" aria-label="Пищевая ценность на 100 г">
<div class="big"><div class="k"><b>{fk(kc)}</b><small>ккал</small></div><div><b>{fnum(p)}</b><small>белки, г</small></div><div><b>{fnum(f)}</b><small>жиры, г</small></div><div><b>{fnum(c)}</b><small>углеводы, г</small></div></div>
</section>
<h2>Пищевая ценность на 100 г</h2>
<div class="card"><table>
<thead><tr><th>Показатель</th><th colspan="4">На 100 г</th></tr></thead>
<tbody><tr><td>Калорийность</td><td colspan="4">{fk(kc)} ккал</td></tr>
<tr><td>Белки</td><td colspan="4">{fnum(p)} г</td></tr>
<tr><td>Жиры</td><td colspan="4">{fnum(f)} г</td></tr>
<tr><td>Углеводы</td><td colspan="4">{fnum(c)} г</td></tr>{fib}</tbody></table></div>
<h2>Калорийность порции</h2>
<div class="card"><table>
<thead><tr><th>Вес</th><th>Ккал</th><th>Б, г</th><th>Ж, г</th><th>У, г</th></tr></thead>
<tbody>{por_rows}</tbody></table>
<p class="note">{esc(por_note)}</p></div>
<a class="cta" href="../?ref=seo-{slug}">Считать калории бесплатно<small>Дневник питания, воды и веса — без рекламы</small></a>
<h2>Что важно знать</h2>
<p>{esc(text)}</p>
<p>{esc(note)}</p>
<p class="note">Значения средние: у конкретного продукта они могут отличаться в зависимости от сорта, рецепта и производителя. Для покупных продуктов ориентируйтесь на этикетку.</p>
<h2>Вопросы и ответы</h2>
{faq_html}
<h2>Похожие продукты</h2>
<ul class="list">{sims_html}</ul>
<p><a href="./#{cat}">Все продукты категории «{esc(cat_name)}»</a> · <a href="../kalkulyator-kaloriy/">Рассчитать свою норму калорий</a></p>
</main>"""
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": SITE + path, "url": SITE + path, "name": title, "description": desc,
         "inLanguage": "ru", "dateModified": TODAY,
         "isPartOf": {"@type": "WebSite", "name": BRAND, "url": SITE},
         "about": {"@type": "Thing", "name": name}},
        crumbs_ld(bc),
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]}
    return path, page(title, desc, path, body, ld), desc, title


# ----------------------------------------------------------- catalog -------

def catalog_page(foods, by_cat):
    path = "kaloriynost/"
    title = f"Таблица калорийности продуктов и блюд на 100 г — БЖУ | {BRAND}"
    desc = (f"Калорийность и БЖУ {len(foods)} продуктов и блюд на 100 г: крупы, мясо, рыба, молочные продукты, "
            "овощи, фрукты, супы и фастфуд. Бесплатный счётчик калорий без рекламы.")
    chips = "".join(f'<a href="#{cid}">{esc(CAT_NAME[cid])}</a>' for cid in by_cat)
    secs = []
    for cid, lst in by_cat.items():
        li = "".join(
            f'<li><a href="{x["slug"]}.html">{esc(x["name"])}<span>{fk(x["v"][0])} ккал</span></a></li>'
            for x in sorted(lst, key=lambda x: x["name"].lower().replace("ё", "е")))
        secs.append(f'<h2 id="{cid}">{esc(CAT_NAME[cid])}</h2><ul class="list">{li}</ul>')
    letters = {}
    for x in sorted(foods, key=lambda x: x["name"].lower().replace("ё", "е")):
        letters.setdefault(x["name"][0].upper(), []).append(x)
    abc = "".join(
        f'<p><b>{esc(L)}</b> ' + ", ".join(f'<a href="{x["slug"]}.html">{esc(x["name"])}</a>' for x in lst) + "</p>"
        for L, lst in letters.items())
    body = f"""{crumbs_html([("Главная", "../"), ("Калорийность продуктов", None)])}
<main>
<h1>Калорийность продуктов и блюд на 100 г</h1>
<p class="lead">Калории, белки, жиры и углеводы для {len(foods)} продуктов и блюд. Значения средние — для покупных продуктов сверяйтесь с этикеткой.</p>
<div class="chips">{chips}<a href="#abc">По алфавиту</a></div>
<a class="cta" href="../?ref=seo-catalog">Считать калории бесплатно<small>Все эти продукты уже есть в поиске приложения</small></a>
{''.join(secs)}
<h2 id="abc">По алфавиту</h2>
<div class="card">{abc}</div>
<p><a href="../kalkulyator-kaloriy/">Калькулятор нормы калорий</a> — узнайте, сколько калорий нужно в день. В разделе <a href="../stati/">статей</a> — как считать калории и БЖУ, сколько пить воды и что делать с плато.</p>
</main>"""
    bc = [("Главная", ""), ("Калорийность продуктов", path)]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": SITE + path, "url": SITE + path, "name": title, "description": desc,
         "inLanguage": "ru", "dateModified": TODAY, "isPartOf": {"@type": "WebSite", "name": BRAND, "url": SITE}},
        crumbs_ld(bc)]}
    return path + "index.html", page(title, desc, path, body, ld, og_type="website")


# -------------------------------------------------------- calculator -------

CALC_JS = r"""
(function(){
var f=document.getElementById('cf'),out=document.getElementById('res');
function v(n){return parseFloat(String(f.elements[n].value).replace(',','.'))}
function r10(x){return Math.round(x/10)*10}
function sex(){return f.querySelector('input[name=sex]:checked').value}
function sync(){document.getElementById('pregBox').style.display=sex()==='f'?'':'none'}
f.addEventListener('change',sync);sync();
f.addEventListener('submit',function(e){
  e.preventDefault();
  var s=sex(),a=v('age'),h=v('h'),w=v('w'),act=v('act'),preg=s==='f'&&f.elements.preg.checked;
  if(!(a>=10&&a<=100&&h>=120&&h<=230&&w>=30&&w<=300)){out.innerHTML='<p>Проверьте данные: возраст 10–100 лет, рост 120–230 см, вес 30–300 кг.</p>';out.hidden=false;return}
  var html='';
  if(a<18){
    html='<p><b style="font-size:20px">Обсудите с врачом</b></p><p>Формула Миффлина — Сан Жеора рассчитана на взрослых. Детям и подросткам нужна энергия для роста, поэтому норму питания подбирает педиатр. Снижать калорийность самостоятельно не стоит.</p>';
  }else{
    var bmr=10*w+6.25*h-5*a+(s==='m'?5:-161),tdee=bmr*act,min=s==='m'?1500:1200;
    html='<div class="line"><span>Базовый обмен (в покое)</span><b>'+r10(bmr)+'</b></div>'+
         '<div class="line"><span>Поддержание веса</span><b>'+r10(tdee)+'</b></div>';
    var bmi=w/Math.pow(h/100,2);
    if(preg){
      html+='<p>Во время беременности и кормления грудью потребность в энергии выше, а дефицит калорий не рекомендуется. Норму и прибавку веса <b style="font-size:inherit;color:inherit">обсудите с врачом</b>.</p>';
    }else if(bmi<18.5){
      html+='<p>Индекс массы тела по вашим данным — '+bmi.toFixed(1).replace('.',',')+', это ниже нормы. Снижать калорийность не стоит: если вес продолжает уходить, обсудите питание с врачом.</p>';
    }else{
      var lose=tdee*0.85,floor=false;if(lose<min){lose=min;floor=true}
      if(lose>=tdee){html+='<p>При ваших данных снижать калорийность ниже '+min+' ккал не стоит. Если хотите изменить вес, обсудите план с врачом.</p>'}
      else{html+='<div class="line"><span>Плавное снижение веса (−15%)</span><b>'+r10(lose)+'</b></div>';
        if(floor)html+='<p class="note">Значение поднято до нижнего порога '+min+' ккал: меньше без контроля врача есть не стоит.</p>'}
      html+='<div class="line"><span>Набор веса (+10%)</span><b>'+r10(tdee*1.1)+'</b></div>';
    }
    html+='<p class="note">Все значения в ккал в день. Это ориентир по формуле: реальная потребность у каждого своя. При хронических заболеваниях обсудите питание с врачом.</p>';
  }
  out.innerHTML=html;out.hidden=false;out.scrollIntoView({behavior:'smooth',block:'nearest'});
});
})();
"""


def calc_page(foods):
    path = "kalkulyator-kaloriy/"
    title = f"Калькулятор калорий онлайн — норма калорий в день по формуле Миффлина — Сан Жеора | {BRAND}"
    desc = ("Бесплатный калькулятор нормы калорий в день по формуле Миффлина — Сан Жеора: поддержание веса, "
            "плавное снижение и набор. Учитывает пол, возраст, рост, вес и активность.")
    popular = [x for x in foods if x["slug"] in (
        "grechka-varenaya", "kurinaya-grudka-varenaya", "ris-belyy-varenyy", "tvorog-5", "yaytso-kurinoe-varenoe",
        "banan", "ovsyanka-na-vode-varenaya", "kartofel-varenyy", "yabloko", "makarony-varenye")]
    pop_html = "".join(
        f'<li><a href="../kaloriynost/{x["slug"]}.html">{esc(x["name"])}<span>{fk(x["v"][0])} ккал</span></a></li>'
        for x in popular)
    acts = [("1.2", "Минимальная: сидячая работа, без тренировок"),
            ("1.375", "Низкая: 1–3 лёгкие тренировки в неделю"),
            ("1.55", "Средняя: 3–5 тренировок в неделю"),
            ("1.725", "Высокая: 6–7 тренировок в неделю"),
            ("1.9", "Очень высокая: физическая работа и спорт")]
    opts = "".join(f'<option value="{a}"{" selected" if a == "1.375" else ""}>{esc(t)}</option>' for a, t in acts)
    faq = [
        ("Как считается норма калорий?",
         "Сначала по формуле Миффлина — Сан Жеора считается базовый обмен: для мужчин 10 × вес + 6,25 × рост − 5 × возраст + 5, для женщин то же самое − 161. Затем результат умножается на коэффициент активности."),
        ("Сколько калорий нужно, чтобы худеть?",
         "Калькулятор показывает плавный дефицит — около 15% от нормы поддержания, но не ниже 1200 ккал для женщин и 1500 ккал для мужчин. Детям, подросткам, беременным и кормящим снижать калорийность без врача не стоит."),
        ("Насколько точен расчёт?",
         "Формула даёт ориентир, ошибка у конкретного человека может составлять 10% и больше. Удобно взять результат за стартовую точку и через 2–3 недели посмотреть на динамику веса."),
    ]
    faq_html = "".join(f"<h3>{esc(q)}</h3><p>{esc(a)}</p>" for q, a in faq)
    body = f"""{crumbs_html([("Главная", "../"), ("Калькулятор калорий", None)])}
<main>
<h1>Калькулятор нормы калорий в день</h1>
<p class="lead">Расчёт по формуле Миффлина — Сан Жеора с учётом активности. Работает прямо в браузере, данные никуда не отправляются.</p>
<form id="cf" class="card" novalidate>
<label>Пол</label>
<div class="seg"><label><input type="radio" name="sex" value="f" checked> Женский</label><label><input type="radio" name="sex" value="m"> Мужской</label></div>
<div class="row"><div><label for="age">Возраст, лет</label><input id="age" name="age" type="number" inputmode="numeric" min="10" max="100" value="30" required></div>
<div><label for="h">Рост, см</label><input id="h" name="h" type="number" inputmode="numeric" min="120" max="230" value="165" required></div></div>
<label for="w">Вес, кг</label><input id="w" name="w" type="number" inputmode="decimal" min="30" max="300" step="0.1" value="65" required>
<label for="act">Активность</label><select id="act" name="act">{opts}</select>
<div id="pregBox"><label class="chk"><input type="checkbox" name="preg"> Беременность или кормление грудью</label></div>
<button class="cta" type="submit">Рассчитать</button>
<div id="res" class="res" hidden aria-live="polite"></div>
</form>
<noscript><p class="note">Для расчёта включите JavaScript.</p></noscript>
<a class="cta" href="../?ref=seo-calc">Считать калории бесплатно<small>Приложение посчитает норму и будет вести дневник питания</small></a>
<h2>Как пользоваться результатом</h2>
<p>Норма поддержания — это примерное количество калорий, при котором вес остаётся стабильным. Для плавного снижения веса калькулятор показывает умеренный дефицит, но не опускается ниже 1200 ккал для женщин и 1500 ккал для мужчин. Детям и подросткам до 18 лет, беременным и кормящим калькулятор не предлагает дефицит: их питание стоит обсудить с врачом.</p>
<p>Чтобы держаться выбранной цифры, удобно записывать еду в дневник. Калорийность популярных продуктов есть в <a href="../kaloriynost/">таблице калорийности</a>. Подробнее о норме — в статье <a href="../stati/skolko-kaloriy-nuzhno-v-den.html">«Сколько калорий нужно в день»</a>, а другие материалы собраны в разделе <a href="../stati/">«Статьи»</a>.</p>
<h2>Популярные продукты</h2>
<ul class="list">{pop_html}</ul>
<h2>Вопросы и ответы</h2>
{faq_html}
</main>
<script>{CALC_JS.strip()}</script>"""
    bc = [("Главная", ""), ("Калькулятор калорий", path)]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": SITE + path, "url": SITE + path, "name": title, "description": desc,
         "inLanguage": "ru", "dateModified": TODAY, "isPartOf": {"@type": "WebSite", "name": BRAND, "url": SITE}},
        {"@type": "WebApplication", "name": "Калькулятор нормы калорий", "url": SITE + path,
         "applicationCategory": "HealthApplication", "operatingSystem": "Web",
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "RUB"}},
        crumbs_ld(bc),
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]}
    return path + "index.html", page(title, desc, path, body, ld, og_type="website")


# ------------------------------------------------------------- sitemap -----

def update_sitemap(entries, prefixes):
    """Обновляет sitemap.xml: убирает URL с данными префиксами и добавляет entries.

    entries: [(путь от корня сайта, changefreq, priority[, lastmod])]. Остальные URL
    (главная, разделы других генераторов) сохраняются как есть.
    """
    import xml.etree.ElementTree as ET
    fp = os.path.join(ROOT, "sitemap.xml")
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    kept = []
    if os.path.exists(fp):
        for u in ET.parse(fp).getroot().findall(ns + "url"):
            loc = (u.findtext(ns + "loc") or "").strip()
            rel = loc[len(SITE):] if loc.startswith(SITE) else None
            if rel is not None and rel and any(rel.startswith(p) for p in prefixes):
                continue
            kept.append((loc, u.findtext(ns + "lastmod") or TODAY,
                         u.findtext(ns + "changefreq") or "monthly", u.findtext(ns + "priority") or "0.5"))
    if not any(k[0] == SITE for k in kept):
        kept.insert(0, (SITE, TODAY, "weekly", "1.0"))
    for e in entries:
        kept.append((SITE + e[0], e[3] if len(e) > 3 else TODAY, e[1], e[2]))
    home = [k for k in kept if k[0] == SITE][:1]
    rest = [k for k in kept if k[0] != SITE]
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lm, freq, pr in home + rest:
        out.append(f"<url><loc>{html.escape(loc)}</loc><lastmod>{lm}</lastmod>"
                   f"<changefreq>{freq}</changefreq><priority>{pr}</priority></url>")
    out.append("</urlset>")
    open(fp, "w", encoding="utf-8").write("\n".join(out) + "\n")
    return len(home + rest)


# ---------------------------------------------------------------- main -----

def prepare_foods(log=None):
    """База продуктов со slug, категорией и бытовыми порциями (используется и gen_articles.py)."""
    src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    if log is None:
        log = {"skipped": set(), "conflicts": [], "rejected": [], "fixed": []}
    foods = build_db(load_foods(src), log)

    seen = {}
    for it in foods:
        it["cat"] = category(it["name"])
        s = slugify(it["name"])
        if s in seen:
            n = 2
            while f"{s}-{n}" in seen:
                n += 1
            s = f"{s}-{n}"
        seen[s] = it
        it["slug"] = s

    hp = load_portions()
    for it in foods:
        it["hp"] = hp.get(norm(it["name"])) or next(
            (hp[norm(k)] for k, v in ALIAS.items() if v == it["name"] and norm(k) in hp), None)
    return foods, seen


def main():
    log = {"skipped": set(), "conflicts": [], "rejected": [], "fixed": []}
    foods, seen = prepare_foods(log)
    print(f"Бытовые порции из js/portions-data.js: {sum(1 for x in foods if x['hp'])} продуктов")

    by_cat = {}
    for cid in DISPLAY_ORDER:
        lst = [x for x in foods if x["cat"] == cid]
        if lst:
            by_cat[cid] = lst

    kdir = os.path.join(ROOT, "kaloriynost")
    if os.path.isdir(kdir):
        shutil.rmtree(kdir)
    os.makedirs(kdir)
    os.makedirs(os.path.join(ROOT, "kalkulyator-kaloriy"), exist_ok=True)

    sm, descs, titles = [], set(), set()
    for it in foods:
        path, doc, desc, title = product_page(it, by_cat, seen)
        if desc in descs or title in titles:
            sys.exit("Неуникальный title/description: " + it["name"])
        descs.add(desc)
        titles.add(title)
        with open(os.path.join(ROOT, path), "w", encoding="utf-8") as fh:
            fh.write(doc)
        sm.append((path, "monthly", "0.6"))

    p, doc = catalog_page(foods, by_cat)
    open(os.path.join(ROOT, p), "w", encoding="utf-8").write(doc)
    p, doc = calc_page(foods)
    open(os.path.join(ROOT, p), "w", encoding="utf-8").write(doc)
    sm = [("kaloriynost/", "weekly", "0.8"), ("kalkulyator-kaloriy/", "monthly", "0.8")] + sm
    total = update_sitemap(sm, ("kaloriynost/", "kalkulyator-kaloriy/"))

    print(f"Продуктов: {len(foods)}; страниц всего: {len(foods) + 2}; URL в sitemap: {total}")
    for cid, lst in by_cat.items():
        print(f"  {CAT_NAME[cid]}: {len(lst)}")
    print(f"Пропущено (бренды/дубли): {len(log['skipped'])}")
    for n, old, new in log["fixed"]:
        print(f"  Исправлено: {n}: {fk(old)} -> {fk(new)} ккал")
    for n, kc, est in log["rejected"]:
        print(f"  Отклонено (БЖУ не сходятся с ккал): {n}: {fk(kc)} ккал, по БЖУ ~{est}")
    for n, kc, alts in log["conflicts"]:
        print(f"  Расхождение: {n}: взято {fk(kc)}; другие: " + "; ".join(f"{a} {fk(k)}" for a, k, _ in alts))


if __name__ == "__main__":
    main()
