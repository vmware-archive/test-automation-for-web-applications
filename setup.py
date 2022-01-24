# /usr/bin/env python
from setuptools import setup, find_packages
from pkg_resources import parse_requirements

import openvus


def get_requirements(source):
    with open(source) as f:
        return sorted({str(req) for req in parse_requirements(f.read())})


setup(
    name="tawa",
    version=openvus.__version__,
    description="Next generation tool for automated testing of web applications.",
    author="VMware vTaaS",
    author_email="etcp-dev@vmware.com",
    url="https://github.com/",
    packages=['tawa'],
    include_package_data=True,
    zip_safe=False,
    classifiers=['Development Status :: 5 - Production/Stable',
                 'Environment :: Web Environment',
                 'Framework :: Django',
                 'Intended Audience :: Developers',
                 'License :: OSI Approved :: BSD License',
                 'Operating System :: OS Independent',
                 'Programming Language :: Python',
                 'Programming Language :: Python :: 3',
                 'Programming Language :: Python :: 3.4',
                 'Programming Language :: Python :: 3.5',
                 'Programming Language :: Python :: 3.6',
                 'Topic :: Utilities'],
    install_requires=get_requirements('requirements.txt'),
)