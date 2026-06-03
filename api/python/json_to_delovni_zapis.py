#!/usr/bin/env python3
"""
Convert JSON driver activity log to Excel delovni zapis (work record).
Usage: python json_to_delovni_zapis.py input.json output.xlsx
"""

import json
import sys
import datetime
from collections import defaultdict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# ── Slovenska imena dni ──────────────────────────────────────────────────────
SL_DAYS = ['ponedeljek','torek','sreda','četrtek','petek','sobota','nedelja']

# ── Preslikava aktivnosti → stolpec ──────────────────────────────────────────
# Stolpci v predlogi:
#   E=Vožnja, F=Delo, G=Zakonski delovni čas, H=Druga dela (M),
#   I=Skupni delovni čas, J=Nočno delo, K=Koriščenje ur (M),
#   L=Dopust, M=Razpoložljivost, N=Izraba odmora, O=Odmori in počitki,
#   P=Nalaganje/razkladanje, Q=Posadka
ACTIVITY_COL = {
    'Vožnja':          5,   # E
    'Delo':            6,   # F
    'Razpoložljivost': 17,  # Q
    # Počitek goes into S (Odmori in počitki) — handled separately
}

STANJE_MAP = {
    'POCITEK':          'Počitek',
    'VOZNJA':           'Vožnja',
    'DELO':             'Delo',
    'RAZPOLOZLJIVOST':  'Razpoložljivost',
    'NEZNANO':          'Neznano',
}

# ── Konfiguracija nočnega dela ──────────────────────────────────────────────────
NIGHT_START = 22  # 22:00 (10 PM)
NIGHT_END = 6     # 06:00 (6 AM)

HH_MM_SS = '[HH]:mm:ss'
GREY_FILL = PatternFill('solid', start_color='CCCCCC', end_color='CCCCCC')
BORDER_THIN = '__thin_black__'  # Bo zamenjano s pravim Border objektom

# Širine stolpcev, ujemajoče se s predlogo
COL_WIDTHS = {
    'A': 45.7, 'B': 24.7, 'C': 22.7, 'D': 45.7, 'E': 15.7,
    'F': 13.0, 'G': 23.7, 'H': 17.7, 'I': 21.7, 'J': 15.7,
    'K': 20.7, 'L': 15.7, 'M': 23.7, 'N': 17.7, 'O': 23.7,
    'P': 21.7, 'Q': 18.7, 'R': 16.7, 'S': 20.7, 'T': 30.7,
    'U': 24.7, 'V': 15.7,
}

HEADERS = [
    'Datum', 'Začetek delovnega dne', 'Konec delovnega dne', 'Prisotnost',
    'Vožnja', 'Delo', 'Zakonski delovni čas', 'Druga dela (M)',
    'Skupni delovni čas', 'Nočno delo', 'Koriščenje ur (M)',
    'Dopust', 'Razpoložljivost', 'Izraba odmora', 'Odmori in počitki',
    'Nalaganje/razkladanje', 'Posadka',
]


def td(minutes: float) -> datetime.timedelta:
    return datetime.timedelta(seconds=int(minutes * 60))


def parse_hhmm(s: str) -> float:
    """Razčleni 'HH:MM' niz → skupne minute."""
    if not s:
        return 0.0
    parts = s.split(':')
    return int(parts[0]) * 60 + int(parts[1])


def load_json(path: str):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def group_by_driver_date(records):
    """Vrne {voznik: {datum: {aktivnost: skupne_minute, ...}}} in surove zapise po vozniku/datu"""
    data = defaultdict(lambda: defaultdict(lambda: defaultdict(float)))
    raw_records = defaultdict(lambda: defaultdict(list))
    all_drivers = []

    for driver_obj in records:
        uporabnik = driver_obj.get('uporabnik', {})
        driver = f"{uporabnik.get('ime', '')} {uporabnik.get('priimek', '')}".strip()
        all_drivers.append(driver)

        for rec in driver_obj.get('voznjeMesec', []):
            stanje = rec.get('stanje', '')
            act = STANJE_MAP.get(stanje, stanje.capitalize() if stanje else '')
            dur = rec.get('trajanje_min', 0)  # already in minutes

            zacetek_str = rec.get('zacetek', '')
            if zacetek_str:
                zacetek_dt = datetime.datetime.fromisoformat(zacetek_str.replace('Z', '+00:00'))
                date = zacetek_dt.date()
            else:
                date = datetime.date.today()

            data[driver][date][act] += dur
            raw_records[driver][date].append(rec)

    return data, all_drivers, raw_records


def all_dates_in_range(date_set):
    """Generiraj vsak datum od najmanjšega do največjega v nizu."""
    if not date_set:
        return []
    mn, mx = min(date_set), max(date_set)
    days = []
    cur = mn
    while cur <= mx:
        days.append(cur)
        cur += datetime.timedelta(days=1)
    return days


def parse_iso_datetime(dt_str: str) -> datetime.datetime:
    """Razčleni ISO niz datuma/časa v objekt datuma/časa."""
    if not dt_str:
        return None
    try:
        return datetime.datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
    except:
        return None


def get_hour_minute(dt: datetime.datetime) -> tuple:
    """Izvleči uro in minuto iz datuma/časa."""
    if not dt:
        return None
    return (dt.hour, dt.minute)


def is_night_work(zacetek_dt: datetime.datetime, konc_dt: datetime.datetime, night_start=NIGHT_START, night_end=NIGHT_END) -> float:
    """Vrne minute prekrivanja aktivnosti z nočnimi urami (22:00–06:00).
    Deluje pravilno za aktivnosti, ki prečkajo polnoč ali trajajo več dni."""
    if not zacetek_dt or not konc_dt:
        return 0.0

    tz = zacetek_dt.tzinfo
    total_overlap = 0.0

    # Preverimo nočna okna začenši od dneva pred začetkom aktivnosti
    check_date = zacetek_dt.date() - datetime.timedelta(days=1)
    end_date = konc_dt.date()

    while check_date <= end_date:
        next_day = check_date + datetime.timedelta(days=1)
        night_begin = datetime.datetime(check_date.year, check_date.month, check_date.day,
                                       night_start, 0, tzinfo=tz)
        night_finish = datetime.datetime(next_day.year, next_day.month, next_day.day,
                                        night_end, 0, tzinfo=tz)

        overlap_start = max(zacetek_dt, night_begin)
        overlap_end = min(konc_dt, night_finish)
        if overlap_end > overlap_start:
            total_overlap += (overlap_end - overlap_start).total_seconds() / 60

        check_date += datetime.timedelta(days=1)

    return total_overlap


def write_driver_sheet(wb: Workbook, driver_name: str, date_activity: dict,
                       company: str, address: str, city: str, emso: str = '', raw_records: dict = None):
    ws = wb.create_sheet(title=driver_name[:31])

    # ── Širine stolpcev ──────────────────────────────────────────────────────
    for col, width in COL_WIDTHS.items():
        ws.column_dimensions[col].width = width

    # Višina vseh vrstic = 30
    def set_row(r):
        ws.row_dimensions[r].height = 30

    # ── Vrstice 1-4: podjetje / podatki voznika ──────────────────────────────
    font15 = Font(name='Calibri', size=15)
    ws['A1'] = company;          ws['A1'].font = font15;  set_row(1)
    ws['C1'] = driver_name;      ws['C1'].font = font15
    ws['A2'] = address;          ws['A2'].font = font15;  set_row(2)
    ws['C2'] = f'EMŠO: {emso}';  ws['C2'].font = font15
    ws['A3'] = city;             ws['A3'].font = font15;  set_row(3)

    all_dates = all_dates_in_range(list(date_activity.keys()))
    if all_dates:
        period = f'{all_dates[0].strftime("%d.%m.%Y")} - {all_dates[-1].strftime("%d.%m.%Y")}'
    else:
        period = ''
    ws['A4'] = period;           ws['A4'].font = font15;  set_row(4)

    set_row(5)  # Prazna vrstica 5

    # ── Vrstica 6: glave stolpcev ───────────────────────────────────────────
    set_row(6)
    hdr_font = Font(name='Calibri', size=12, bold=True)
    center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'),
                         top=Side(style='thin'), bottom=Side(style='thin'))
    for col_idx, hdr in enumerate(HEADERS, start=1):
        c = ws.cell(row=6, column=col_idx, value=hdr)
        c.font = hdr_font
        c.border = thin_border
        c.alignment = center_align

    # ── Sestavi skupine tednov ──────────────────────────────────────────────
    # ISO teden: grupiraj zaporedne datume po ISO številki tedna
    weeks = defaultdict(list)
    for d in all_dates:
        weeks[d.isocalendar()[:2]].append(d)  # (leto, teden) → [datumi]

    sorted_weeks = sorted(weeks.keys())

    current_row = 7
    week_count = 0  # Sledi številu tednov za izračun povprečja
    total_mins = defaultdict(float)  # column_idx → skupne minute
    thin_border = Border(left=Side(style='thin'), right=Side(style='thin'),
                         top=Side(style='thin'), bottom=Side(style='thin'))

    for wk_key in sorted_weeks:
        iso_year, iso_week = wk_key
        week_count += 1
        week_dates = sorted(weeks[wk_key])
        week_totals = defaultdict(float)

        for d in week_dates:
            set_row(current_row)
            day_label = f'{d.strftime("%d.%m.%Y")} {SL_DAYS[d.weekday()]}'
            cell_day = ws.cell(row=current_row, column=1, value=day_label)
            center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell_day.alignment = center_align

            acts = date_activity.get(d, {})
            
            # Pridobi surove zapise za ta dan za izračun natančnih časov začetka/konca
            day_records = []
            if raw_records and driver_name in raw_records and d in raw_records[driver_name]:
                day_records = raw_records[driver_name][d]

            # Seštej minute aktivnosti za zaznavo začetka/konca
            active_mins = sum(v for k, v in acts.items()
                              if k not in ('Počitek', 'Neznano', 'Razpoložljivost'))
            rest_mins = acts.get('Počitek', 0.0)
            voznja_mins = acts.get('Vožnja', 0.0)
            delo_mins = acts.get('Delo', 0.0)
            razpol_mins = acts.get('Razpoložljivost', 0.0)
            skupni_mins = voznja_mins + delo_mins + razpol_mins
            
            # Izračunaj čase začetka in konca iz aktivnih zapisov (vožnja/delo)
            start_time = None
            end_time = None
            nocno_delo_mins = 0.0
            
            for rec in day_records:
                act_type = STANJE_MAP.get(rec.get('stanje', ''), '')
                if act_type in ('Vožnja', 'Delo'):
                    zacetek_dt = parse_iso_datetime(rec.get('zacetek', ''))
                    konc_dt = parse_iso_datetime(rec.get('konec', ''))

                    if zacetek_dt:
                        if start_time is None or zacetek_dt < start_time:
                            start_time = zacetek_dt
                    if konc_dt:
                        if end_time is None or konc_dt > end_time:
                            end_time = konc_dt

                    night_mins = is_night_work(zacetek_dt, konc_dt)
                    nocno_delo_mins += night_mins

            # Zapiši čase začetka/konca
            if start_time:
                cell_start = ws.cell(row=current_row, column=2, value=start_time.strftime('%H:%M'))
                cell_start.alignment = center_align
            if end_time:
                cell_end = ws.cell(row=current_row, column=3, value=end_time.strftime('%H:%M'))
                cell_end.alignment = center_align

            # Izračunaj Prisotnost kot časovni razpon od začetka prve aktivnosti do konca zadnje aktivnosti
            prisotnost_mins = 0.0
            if start_time and end_time:
                prisotnost_mins = (end_time - start_time).total_seconds() / 60

            if prisotnost_mins > 0:
                # D=Prisotnost: časovni razpon od prvega začetka do zadnjega konca
                cell_prisotnost = ws.cell(row=current_row, column=4, value=td(prisotnost_mins))
                cell_prisotnost.number_format = HH_MM_SS
                cell_prisotnost.alignment = center_align

            # Zapiši trajanja aktivnosti v njihove stolpce
            center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
            def write_td(col, mins):
                c = ws.cell(row=current_row, column=col, value=td(mins))
                c.number_format = HH_MM_SS
                c.border = thin_border
                c.alignment = center_align
                week_totals[col] += mins
                total_mins[col] += mins
            
            def write_td_border(col, mins):
                c = ws.cell(row=current_row, column=col, value=td(mins))
                c.number_format = HH_MM_SS
                c.border = thin_border
                return c

            # Uporabi robove in center poravnavo na vse podatkovne celice
            for col in range(1, 18):
                c = ws.cell(row=current_row, column=col)
                c.border = thin_border
                c.alignment = center_align

            write_td(5, voznja_mins)           # E Vožnja
            write_td(6, delo_mins)             # F Delo
            write_td(7, skupni_mins)           # G Zakonski delovni čas
            write_td(8, 0)                     # H Druga dela
            write_td(9, skupni_mins)           # I Skupni delovni čas
            write_td(10, nocno_delo_mins)      # J Nočno delo (izračunano)
            write_td(11, 0)                    # K Koriščenje
            write_td(12, 0)                    # L Dopust
            write_td(13, razpol_mins)          # M Razpoložljivost

            # N=Izraba odmora (pusti prazno), O=Odmori in počitki
            total_day_full = sum(acts.values()) if acts else 24 * 60
            write_td(15, rest_mins if rest_mins else (24 * 60 - skupni_mins) if skupni_mins == 0 else 0)  # O

            ws.cell(row=current_row, column=17, value='Ne')  # Q Posadka
            ws['Q%d' % current_row].border = thin_border
            ws['Q%d' % current_row].alignment = center_align

            current_row += 1

        # ── Vrstica povzetka tedna ──────────────────────────────────────────
        set_row(current_row)
        wt_cell = ws.cell(row=current_row, column=1, value=f'Teden {iso_week}')
        wt_cell.fill = GREY_FILL
        wt_cell.border = thin_border

        for col in range(1, 18):
            c = ws.cell(row=current_row, column=col)
            c.fill = GREY_FILL
            c.border = thin_border
            c.alignment = center_align

        # Teden prikazuje Skupni (col 9) in Nočno (col 10)
        c_i = ws.cell(row=current_row, column=9, value=td(week_totals[9]))
        c_i.number_format = HH_MM_SS
        c_i.fill = GREY_FILL
        c_i.border = thin_border

        c_j = ws.cell(row=current_row, column=10, value=td(week_totals[10]))
        c_j.number_format = HH_MM_SS
        c_j.fill = GREY_FILL
        c_j.border = thin_border

        current_row += 1

    # ── Prazna vrstica med podatki in Seštevek ──────────────────────────────
    set_row(current_row)
    current_row += 1

    # ── Vrstica Seštevek ────────────────────────────────────────────────────
    set_row(current_row)
    ws.cell(row=current_row, column=1, value='Seštevek')

    sestevek_row = current_row
    center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for col in [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]:
        c = ws.cell(row=current_row, column=col, value=td(total_mins.get(col, 0)))
        c.number_format = HH_MM_SS
        c.alignment = center_align

    current_row += 2  # prazna + začetek noge

    # ── Vrstice noge ────────────────────────────────────────────────────────
    # Vrstica: Mesečna delovna obveznost
    set_row(current_row)
    ws.cell(row=current_row, column=1, value='Mesečna delovna obveznost')
    # 176h = 7 dni + 8h = td(10560 min) — standardna mesečna obveznost
    ws.cell(row=current_row, column=2, value=td(10560)).number_format = HH_MM_SS
    ws['B%d' % current_row].number_format = HH_MM_SS
    ws.cell(row=current_row, column=4, value='Nabor ur za zadnje 4 mesece *')
    ws.cell(row=current_row, column=5, value=td(32 * 24 * 60)).number_format = HH_MM_SS
    ws['E%d' % current_row].number_format = HH_MM_SS
    ws.cell(row=current_row, column=13, value='____________________')
    ws.cell(row=current_row, column=15, value='____________________')
    current_row += 1

    # Vrstica: Zmanjšana mesečna delovna obveznost
    set_row(current_row)
    ws.cell(row=current_row, column=1, value='Zmanjšana mesečna delovna obveznost')
    ws.cell(row=current_row, column=2, value=td(10560))
    ws['B%d' % current_row].number_format = HH_MM_SS
    ws.cell(row=current_row, column=4, value='Ustvarjene ure v zadnjih 4 mesecih *')
    total_skupni = total_mins.get(9, 0)
    ws.cell(row=current_row, column=5, value=td(total_skupni))
    ws['E%d' % current_row].number_format = HH_MM_SS
    ws.cell(row=current_row, column=13, value=driver_name)
    ws.cell(row=current_row, column=15, value=company)
    current_row += 1

    # Vrstica: Opravljene ure
    set_row(current_row)
    ws.cell(row=current_row, column=1, value='Opravljene ure')
    ws.cell(row=current_row, column=2, value=td(total_skupni))
    ws['B%d' % current_row].number_format = HH_MM_SS
    ws.cell(row=current_row, column=4, value='Tedensko povprečje')
    avg = total_skupni / max(week_count, 1)
    ws.cell(row=current_row, column=5, value=td(avg))
    ws['E%d' % current_row].number_format = HH_MM_SS
    current_row += 1

    # Vrstica: Presežek
    set_row(current_row)
    ws.cell(row=current_row, column=1, value='Presežek')
    ws.cell(row=current_row, column=2, value=td(0))
    ws['B%d' % current_row].number_format = HH_MM_SS
    ws.cell(row=current_row, column=4, value='* Zadnjih zaključenih 16 tednov')

    return ws


def main():
    if len(sys.argv) < 3:
        print('Uporaba: python json_to_delovni_zapis.py input.json output.xlsx')
        sys.exit(1)

    json_path = sys.argv[1]
    out_path  = sys.argv[2]

    # Opcijski podatki podjetja prek argumentov 3-5
    company = "JAKOB d.o.o.o"
    address = "PAKA 4"
    city    = "3205 VITANJE"

    records = load_json(json_path)
    date_by_driver, drivers, raw_records = group_by_driver_date(records)

    wb = Workbook()
    wb.remove(wb.active)  # Odstrani privzeti list

    for driver in drivers:
        write_driver_sheet(
            wb, driver, date_by_driver[driver],
            company=company, address=address, city=city,
            raw_records=raw_records
        )

    wb.save(out_path)
    print(f'Shranjeno: {out_path}  ({len(drivers)} list(a): {', '.join(drivers)})')


if __name__ == '__main__':
    main()
