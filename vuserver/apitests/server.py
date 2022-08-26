import time

from flask import Flask, Response, jsonify, redirect, request

app = Flask(__name__)


@app.route("/hello/", methods=["GET"])
def hello_test():
    time.sleep(0.25)

    response = {"status": "OK", "message": "hello world"}
    return jsonify(response), 200


@app.route("/screenshot/create_screenshot_product_test/", methods=["POST"])
def screen_shot_test():
    time.sleep(0.25)

    response = {"status": "OK"}
    return jsonify(response), 200


@app.route("/screenshot/take_screenshot/", methods=["POST"])
def take_screenshot():
    time.sleep(0.25)
    return_data="iVBORw0KGgoAAAANSUhEUgAAABsAAAAbCAMAAAC6CgRnAAAAPFBMVEX///8AAAD9/" \
                "f2CgoKAgIAAAAAAAAAAAABLS0sAAAAAAACqqqqqqqq6urpKSkpISEgAAAC7u7u5ubn////" \
                "zbsMcAAAAE3RSTlMASv6rqwAWS5YMC7/AyZWVFcrJCYaKfAAAAHhJREFUeF590kkOgCAQRF" \
                "EaFVGc+/53FYmbz6JqBbyQMFSYuoQuV+iTflnstI7ssLXRvMWRaEMs84e2uVckuZe6knL0h" \
                "iSPObXhj6ChzoEkIolIIpKIO4joICAIeDd7QGIfCCjOKe9HEk8mnxpIAup/F31RPZP9fAG3IA" \
                "yBSJe0igAAAABJRU5ErkJggg=="
    response = {"status": "OK", "screenshot_raw_file_name": return_data}
    return jsonify(response), 200


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=9002)
