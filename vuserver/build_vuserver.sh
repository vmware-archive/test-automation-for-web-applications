# Copyright 2022 VMware, Inc.
# SPDX-License-Identifier: Apache License 2.0

docker build -t vuserver:tawa .
docker tag vuserver:tawa harbor-repo.vmware.com/vtaas_workers/vuserver:tawa
docker push harbor-repo.vmware.com/vtaas_workers/vuserver:tawa

