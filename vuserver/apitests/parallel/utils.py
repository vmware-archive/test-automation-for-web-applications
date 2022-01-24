# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import time

def return_name():
    return {"name": time.strftime("test%Y%m%d%H%M")}