"""Default license features for database seeding."""

DEFAULT_LICENSE_FEATURES: list[tuple[str, str]] = [
    # Free
    ("free", "upload_pdf"), ("free", "download_pdf"), ("free", "extract_text"),
    # Pro
    ("pro", "upload_pdf"), ("pro", "download_pdf"), ("pro", "extract_text"),
    ("pro", "merge_pdf"), ("pro", "split_pdf"), ("pro", "reorder_pages"),
    ("pro", "remove_pages"), ("pro", "replace_text"), ("pro", "edit_metadata"),
    ("pro", "export_txt"), ("pro", "export_png"), ("pro", "export_jpg"),
    ("pro", "import_txt"), ("pro", "import_docx"), ("pro", "max_file_size_50mb"),
    ("pro", "sign_pdf"), ("pro", "annotations"),
    # Enterprise
    ("enterprise", "upload_pdf"), ("enterprise", "download_pdf"),
    ("enterprise", "extract_text"), ("enterprise", "merge_pdf"),
    ("enterprise", "split_pdf"), ("enterprise", "reorder_pages"),
    ("enterprise", "remove_pages"), ("enterprise", "replace_text"),
    ("enterprise", "edit_metadata"), ("enterprise", "export_txt"),
    ("enterprise", "export_png"), ("enterprise", "export_jpg"),
    ("enterprise", "export_svg"), ("enterprise", "import_txt"),
    ("enterprise", "import_images"), ("enterprise", "import_docx"),
    ("enterprise", "max_file_size_100mb"), ("enterprise", "sign_pdf"),
    ("enterprise", "annotations"),
]