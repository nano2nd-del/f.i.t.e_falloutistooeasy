How to run it yourself:


You need Python 3 with two libraries. If you don't have them:

pip install pillow scipy

Then grab fite_lineart_pipeline.py 
Open it in any text editor and change the block at the top:

pythonINPUT_PATH  = "C:/path/to/your/screenshot.png"   # your image
OUTPUT_PATH = "C:/path/to/output.png"             # where to save
HAS_ALPHA   = False   # False for screenshots, True for PNG with transparency
TARGET_W    = 800     # output width
TARGET_H    = 450     # output height (800×450 = 16:9)
Then tweak the tuning knobs if needed — THRESHOLD is your main lever (higher = fewer, bolder lines). Save the file and run:
python fite_lineart_pipeline.py
That's it. Each run prints the settings it used so you can track what changed between versions.