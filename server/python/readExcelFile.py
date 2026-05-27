#!/usr/bin/env python3
"""
Read Excel file and convert to JSON format.
Extracts specified columns and saves as structured JSON.
"""

import json
from pathlib import Path
from openpyxl import load_workbook
from datetime import datetime
import sys


def read_excel_to_json(file_path, output_json_path=None):
    """
    Read Excel file and convert to JSON.
    Handles the specific format: Voznik | Jakob Jan (metadata)
    Then data table with: Začetek | [time] | Konec | [time] | Dolžina | Aktivnost | Registrska 
    
    Args:
        file_path: Path to Excel file
        output_json_path: Optional path to save JSON output
        
    Returns:
        Dictionary with records and file info
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Load workbook
    wb = load_workbook(file_path)
    ws = wb.active
    
    # Extract voznik from metadata (Row 1, Col 1 = "Jakob Jan")
    voznik = ws.cell(row=1, column=2).value or "Unknown"
    
    # Find the data table header row (should contain "Začetek", "Konec", "Dolžina", "Aktivnost", "Registrska")
    header_row_idx = None
    for row_idx in range(1, min(20, ws.max_row + 1)):
        cell_val = ws.cell(row=row_idx, column=1).value
        if cell_val and str(cell_val).lower() == "začetek":
            header_row_idx = row_idx
            break
    
    if not header_row_idx:
        raise ValueError("Could not find data table header row with 'Začetek'")
    
    print(f"Found data table at row {header_row_idx}")
    print(f"Driver: {voznik}")
    
    records = []
    
    # Read data rows (starting after header row)
    for row_idx in range(header_row_idx + 1, ws.max_row + 1):
        # Read all columns from this row
        zacetek_date = ws.cell(row=row_idx, column=1).value
        zacetek_time = ws.cell(row=row_idx, column=2).value
        konec_date = ws.cell(row=row_idx, column=3).value
        konec_time = ws.cell(row=row_idx, column=4).value
        dolzina = ws.cell(row=row_idx, column=5).value
        aktivnost = ws.cell(row=row_idx, column=6).value
        registerska = ws.cell(row=row_idx, column=7).value
        posadka = ws.cell(row=row_idx, column=8).value
        # Skip empty rows
        if not zacetek_date and not konec_date:
            continue
        
        # Format timestamps
        zacetek_str = format_datetime(zacetek_date, zacetek_time)
        konec_str = format_datetime(konec_date, konec_time)
        
        record = {
            'voznik': voznik,
            'zacetek': zacetek_str,
            'konec': konec_str,
            'dolzina': str(dolzina) if dolzina else None,
            'aktivnost': str(aktivnost) if aktivnost else None,
            'registerska': str(registerska) if registerska else None,
            'posadka': str(posadka) if posadka else None  
        }
        
        records.append(record)
    
    result = {
        'voznik': voznik,
        'records': records,
        'file_info': {
            'filename': file_path.name,
            'file_size': file_path.stat().st_size,
            'total_records': len(records),
            'format': 'Excel to JSON'
        }
    }
    
    # Save to JSON if output path provided
    if output_json_path:
        output_path = Path(output_json_path)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"JSON saved to: {output_path}")
    
    return result


def format_datetime(date_val, time_val):
    """
    Format date and time values into ISO format string.
    Handles datetime objects and string dates like "01.04.2026" and times like "00:00"
    """
    try:
        # If date is already a datetime, use it
        if hasattr(date_val, 'isoformat'):
            date_obj = date_val
        else:
            # Try parsing string format "DD.MM.YYYY"
            date_str = str(date_val).strip() if date_val else ""
            if '.' in date_str:
                parts = date_str.split('.')
                date_obj = datetime(int(parts[2]), int(parts[1]), int(parts[0]))
            else:
                return None
        
        # Parse time
        time_str = str(time_val).strip() if time_val else "00:00"
        time_parts = time_str.split(':')
        hour = int(time_parts[0])
        minute = int(time_parts[1]) if len(time_parts) > 1 else 0
        
        # Combine date and time
        result = date_obj.replace(hour=hour, minute=minute)
        return result.isoformat()
    except Exception as e:
        print(f"Error formatting datetime {date_val} {time_val}: {e}")
        return None


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python readExcelFile.py <excel_file> [output_json_file]")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    output_json = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        result = read_excel_to_json(excel_file, output_json)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
