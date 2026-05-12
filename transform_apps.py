import os
import re

def process_file(file_path, alias_from, alias_to, route_prefix):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace aliases
    # We want to replace @/ but not things like @v1/
    content = content.replace(alias_from, alias_to)
    
    # 2. Replace absolute routes in Link, Navigate, etc.
    # Regex to find to="/something" but not to="/v1/something" or to="/v2/something"
    # We look for to="/ or Navigate to="/ or href="/
    
    # to="/(?!v1/|v2/)
    content = re.sub(r'to="/(?!v1/|v2/)', f'to="{route_prefix}/', content)
    # href="/(?!v1/|v2/)
    content = re.sub(r'href="/(?!v1/|v2/)', f'href="{route_prefix}/', content)
    # Navigate to="/(?!v1/|v2/)
    content = re.sub(r'Navigate to="/(?!v1/|v2/)', f'Navigate to="{route_prefix}/', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def walk_and_process(dir_path, alias_from, alias_to, route_prefix):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                process_file(os.path.join(root, file), alias_from, alias_to, route_prefix)

# Process V1
print("Processing V1...")
walk_and_process('src/apps/v1', '@/', '@v1/', '/v1')

# Process V2
print("Processing V2...")
walk_and_process('src/apps/v2', '@/', '@v2/', '/v2')
