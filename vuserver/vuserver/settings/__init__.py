import os
settings_module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
if settings_module.find('local') > 0:
    from .local import *
elif settings_module.find('staging') > 0:
    from .staging import *