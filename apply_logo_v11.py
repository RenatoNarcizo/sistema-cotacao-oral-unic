import re
import os

def apply_v11_logo():
    html_path = r"C:\Users\User\Documents\Projetossistema-cotacao\index.html"
    logo_txt_path = r"C:\Users\User\.gemini\antigravity\scratch\logo_base64_v11.txt"
    
    with open(logo_txt_path, 'r', encoding='utf-8') as f:
        new_logo_b64 = f.read().strip()

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'(<img id="logo-oral-unic" src=")([^"]*)(" style="display:none;">)'
    new_content = re.sub(pattern, rf'\1{new_logo_b64}\3', content)

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("Sucesso: Logo V11 aplicado ao index.html.")

if __name__ == "__main__":
    apply_v11_logo()
