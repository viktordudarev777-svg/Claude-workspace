"""Собрать build/fonts.css (Montserrat + Inter, latin+cyrillic, встроены base64).
Требуется: npm i @fontsource/montserrat@5 @fontsource/inter@5  (шрифты под SIL OFL 1.1)"""
import base64, pathlib, sys
NM=sys.argv[1] if len(sys.argv)>1 else "node_modules/@fontsource"
css=[]
def add(fam,pkg,w,subset):
    b=base64.b64encode(pathlib.Path(f"{NM}/{pkg}/files/{pkg}-{subset}-{w}-normal.woff2").read_bytes()).decode()
    css.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:block;src:url(data:font/woff2;base64,{b}) format('woff2');}}")
for w in (400,700,800,900):
    for s in ("latin","cyrillic"): add("Mont","montserrat",w,s)
for w in (400,600,700):
    for s in ("latin","cyrillic"): add("Int","inter",w,s)
pathlib.Path("build/fonts.css").write_text("\n".join(css)); print("build/fonts.css готов")
