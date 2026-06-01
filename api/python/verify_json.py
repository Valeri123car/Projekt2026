import json

with open('jakob_jan_dejavnosti.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f'Total records: {len(data["records"])}')
print(f'Driver: {data["voznik"]}')
print(f'\nFirst record:')
print(json.dumps(data["records"][0], indent=2, ensure_ascii=False))
print(f'\nLast record:')
print(json.dumps(data["records"][-1], indent=2, ensure_ascii=False))

# Check for null registerska
null_registerska = sum(1 for r in data["records"] if r.get("registerska") is None)
print(f'\nRecords with null registerska: {null_registerska}')
print(f'Records with registerska: {len(data["records"]) - null_registerska}')
