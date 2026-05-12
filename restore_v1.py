import subprocess
import os

with open('v1_files.txt', 'r') as f:
    files = f.read().splitlines()

for file_path in files:
    # file_path is like 'src/components/common/BrainLoader.tsx'
    # we want to save it to 'src/apps/v1/components/common/BrainLoader.tsx' (removing the first 'src/')
    relative_path = os.path.relpath(file_path, 'src')
    target_path = os.path.join('src/apps/v1', relative_path)
    
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    try:
        content = subprocess.check_output(['git', 'show', f'HEAD~30:{file_path}'])
        with open(target_path, 'wb') as out_f:
            out_f.write(content)
    except Exception as e:
        print(f"Error restoring {file_path}: {e}")
