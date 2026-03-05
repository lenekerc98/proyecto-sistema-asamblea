import pkg_resources
installed_packages = [d.project_name for d in pkg_resources.working_set]
print("xhtml2pdf" in installed_packages)
print("fpdf2" in [d.project_name.lower() for d in pkg_resources.working_set])
print("jinja2" in installed_packages)
print(installed_packages)
