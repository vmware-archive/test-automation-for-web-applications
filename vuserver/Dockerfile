# Python Base Image
#FROM python:3.7
FROM tomshin/envbase
RUN echo 'Base image setup completed'

# Environment Variable
ENV PYTHONUNBUFFERED 1
ENV WORKDIR /app
# Make and set working directory
RUN echo 'Making the working directory "/app"'
RUN mkdir ${WORKDIR}

# Set Work Directory
WORKDIR ${WORKDIR}

# Copy the requirement file to working directory
RUN echo 'Copying the requirement file to working directory'
COPY requirements.txt $WORKDIR

# Install dependecies with pip
RUN echo 'Installing the dependencies'
RUN pip install -r requirements.txt


RUN apt-get update -y
RUN apt-get install -y ffmpeg libsm6 libxext6 x264 libx264-dev python3-opencv

RUN echo 'Copying the project code to working directory'
COPY . $WORKDIR

EXPOSE 9100
RUN python manage.py collectstatic --no-input && python manage.py migrate --settings=vuserver.settings.staging
# Python execute command
CMD ["gunicorn", "--bind", ":9100", "vuserver.wsgi:application"]