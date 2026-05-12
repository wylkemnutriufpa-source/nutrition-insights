import os
import re

def process_file(file_path, route_prefix):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Prefix absolute routes in Link, Navigate, etc.
    # to="/... -> to="/v1/...
    # navigate("/... -> navigate("/v1/...
    # href="/... -> href="/v1/...
    
    # We use (?!v1/|v2/|http|https|mailto|tel|#) to avoid double prefixing or external links
    content = re.sub(r'to="/(?!v1/|v2/|http|https|mailto|tel|#)', f'to="{route_prefix}/', content)
    content = re.sub(r'href="/(?!v1/|v2/|http|https|mailto|tel|#)', f'href="{route_prefix}/', content)
    content = re.sub(r'Navigate to="/(?!v1/|v2/|http|https|mailto|tel|#)', f'Navigate to="{route_prefix}/', content)
    content = re.sub(r'navigate\("/(?!v1/|v2/|http|https|mailto|tel|#)', f'navigate("{route_prefix}/', content)
    
    # Handle template literals to={`/${search}`}
    content = re.sub(r'to=\{`/(?!v1/|v2/)', f'to={{`{route_prefix}/', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def walk_and_process(dir_path, route_prefix):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                process_file(os.path.join(root, file), route_prefix)

print("Fixing V1 routes...")
walk_and_process('src/apps/v1', '/v1')

print("Fixing V2 routes...")
walk_and_process('src/apps/v2', '/v2')
