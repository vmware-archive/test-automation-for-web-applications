# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

import time
from datetime import datetime

from box import Box


def generate_dict_data():
    test_dict = {"events": {
        "a": 1
    }}
    return Box(test_dict)


def return_name():
    return {"name": time.strftime("test%Y%m%d%H%M%S")}


# a = time.strftime("%Y%m%d")
a = time.strftime("%Y%m%d%H%M%S")
print(a)
print(len(a))
b = datetime.strptime(str(a), "%Y%m%d%H%M%S")
# b = datetime.strptime(str(a), "%Y%m%d")
print(b)
# print(len(b))