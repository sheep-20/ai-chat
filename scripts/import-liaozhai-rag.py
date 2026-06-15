from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "rag_sources" / "liaozhai"
OUT_PATH = ROOT / "src" / "worlds" / "world2" / "rag" / "chunks.json"
TARGET_STORIES = ["聂小倩", "画皮", "促织", "婴宁", "崂山道士", "狐嫁女"]
CHUNK_SIZE = 520
CHUNK_OVERLAP = 80


def normalize_text(text: str) -> str:
    text = text.replace("\ufeff", "")
    text = re.sub(r"[ \t\r\f\v]+", "", text)
    text = re.sub(r"\n{2,}", "\n", text)
    return text.strip()


def read_txt(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gb18030", "big5"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"无法识别文本编码：{path}")


def read_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError:
        try:
            import pdfplumber  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "读取 PDF 需要先安装 pypdf 或 pdfplumber，或把 PDF 内容另存为 .txt 后再导入。"
            ) from exc
        with pdfplumber.open(path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)

    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def read_source(path: Path) -> str:
    if path.suffix.lower() == ".txt":
        return read_txt(path)
    if path.suffix.lower() == ".pdf":
        return read_pdf(path)
    return ""


def find_story_sections(text: str) -> dict[str, str]:
    positions: list[tuple[str, int]] = []
    for title in TARGET_STORIES:
        match = re.search(rf"(?m)(?:^|\n)\s*{re.escape(title)}\s*(?:\n|$)", text)
        if not match:
            match = re.search(re.escape(title), text)
        if match:
            positions.append((title, match.start()))

    positions.sort(key=lambda item: item[1])
    sections: dict[str, str] = {}
    for index, (title, start) in enumerate(positions):
        end = positions[index + 1][1] if index + 1 < len(positions) else len(text)
        section = text[start:end].strip()
        if len(section) >= 80:
            sections[title] = section
    return sections


def chunk_text(text: str) -> list[str]:
    compact = normalize_text(text)
    if not compact:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(compact):
        end = min(len(compact), start + CHUNK_SIZE)
        window = compact[start:end]
        split_at = max(window.rfind(mark) for mark in ("。", "！", "？", "\n"))
        if split_at > 180 and end < len(compact):
            end = start + split_at + 1
            window = compact[start:end]
        if len(window.strip()) >= 60:
            chunks.append(window.strip())
        if end >= len(compact):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)
    return chunks


def main() -> int:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    source_files = [
        path for path in SOURCE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in {".pdf", ".txt"}
    ]
    if not source_files:
        print(f"未找到 PDF/TXT。请把资料放入：{SOURCE_DIR}")
        return 1

    chunks = []
    found_titles: set[str] = set()
    for source in sorted(source_files):
        print(f"读取：{source.name}")
        text = normalize_text(read_source(source))
        sections = find_story_sections(text)
        if not sections and source.suffix.lower() == ".txt":
            title = source.stem
            if title in TARGET_STORIES:
                sections[title] = text

        for title, section in sections.items():
            found_titles.add(title)
            for chunk_index, content in enumerate(chunk_text(section)):
                chunks.append({
                    "id": f"world2-{title}-{source.stem}-{chunk_index}".lower(),
                    "worldId": "world2",
                    "storyTitle": title,
                    "chunkIndex": chunk_index,
                    "sourceName": source.name,
                    "content": content,
                })

    payload = {
        "version": 1,
        "worldId": "world2",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "targetStories": TARGET_STORIES,
        "foundStories": sorted(found_titles),
        "chunks": chunks,
    }
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"已生成：{OUT_PATH}")
    print(f"篇目：{', '.join(sorted(found_titles)) or '无'}")
    print(f"片段数：{len(chunks)}")
    return 0 if chunks else 1


if __name__ == "__main__":
    raise SystemExit(main())
