package com.example.benlister.adtechspikes;

import android.app.Activity;
import android.os.Bundle;
import android.os.Environment;
import android.view.Menu;
import android.view.MenuItem;
import android.view.SurfaceView;
import android.view.WindowManager;

import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.CameraBridgeViewBase;
import org.opencv.android.LoaderCallbackInterface;
import org.opencv.android.OpenCVLoader;
import org.opencv.core.Mat;
import org.opencv.core.MatOfByte;
import org.opencv.core.MatOfDMatch;
import org.opencv.core.MatOfKeyPoint;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.features2d.DMatch;
import org.opencv.features2d.DescriptorExtractor;
import org.opencv.features2d.DescriptorMatcher;
import org.opencv.features2d.FeatureDetector;
import org.opencv.features2d.Features2d;
import org.opencv.highgui.Highgui;
import org.opencv.imgproc.Imgproc;

import java.io.File;
import java.io.FileDescriptor;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.channels.FileChannel;
import java.util.List;
import java.util.Vector;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ImageRecognitionActivity extends Activity implements CameraBridgeViewBase.CvCameraViewListener2 {

    private CameraBridgeViewBase mOpenCvCameraView;
    private FeatureDetector featureDetector;
    private DescriptorExtractor featureExtractor;
    private DescriptorMatcher matcher;

    // reference image features
    private Mat referenceImage = null;
    private MatOfKeyPoint referenceKeyPoints;
    private Mat referenceDescriptors;

    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(this) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS: {
                    log.info("OpenCV loaded successfully");

                    // TODO: From here down only needs doing once, not on every callback
                    featureDetector = FeatureDetector.create(FeatureDetector.ORB);
                    featureExtractor = DescriptorExtractor.create(DescriptorExtractor.ORB);
                    matcher = DescriptorMatcher.create(DescriptorMatcher.BRUTEFORCE_HAMMING);
                    referenceKeyPoints = new MatOfKeyPoint();
                    referenceDescriptors = new Mat();

                    // load reference image from disk & process
                    log.info("Loading reference image from disk and establishing keypoint descriptors");

                    // move reference image from assets to external storage, so we can access it by path
                    FileChannel inChannel = null;
                    FileChannel outChannel = null;
                    File file = null;
                    String referenceImagePath = null;
                    try {
                        try {
                            File directory = Environment.getExternalStorageDirectory();
                            directory.mkdirs();
                            file = new File(Environment.getExternalStorageDirectory() + java.io.File.separator + "imageToRecognise.png");
                            if (!file.exists()) {
                                // move from assets directory to external storage
                                log.info("Moving reference image to external storage...");
                                FileDescriptor in = mAppContext.getAssets().openFd("unilever.png").getFileDescriptor();
                                inChannel = new FileInputStream(in).getChannel();
                                file.createNewFile();
                                outChannel = new FileOutputStream(file).getChannel();
                                inChannel.transferTo(0, inChannel.size(), outChannel);

                            }
                            referenceImagePath = file.getAbsolutePath();
                        } finally {
                            if (inChannel != null) inChannel.close();
                            if (outChannel != null) outChannel.close();
                        }
                    } catch (IOException e) {
                        log.error("Failed to open reference image file (assets directory)", e);
                        return;
                    }

                    //if (referenceImagePath.startsWith("/")) referenceImagePath = referenceImagePath.substring(1);  // strip leading slash
                    log.info("Reference image is at: " + referenceImagePath);
                    log.info("Reference image canRead=" + file.canRead() +
                            " canWrite=" + file.canWrite() +
                            " isAbsolute=" + file.isAbsolute() +
                            " size=" + file.getTotalSpace());
                    referenceImagePath = "/storage/emulated/legacy/imageToRecognise.png";  //TODO stop this being hard-coded without breaking it
                    referenceImage = Highgui.imread(referenceImagePath, Highgui.IMREAD_GRAYSCALE);
                    log.info("Reference image size is: " + referenceImage.size());

                    log.info("Detecting features in reference image...");
                    featureDetector.detect(referenceImage, referenceKeyPoints);
                    log.info(referenceKeyPoints.size() + " features found");

                    log.info("Computing descriptors for reference image features...");
                    featureExtractor.compute(referenceImage, referenceKeyPoints, referenceDescriptors);
                    log.info(referenceDescriptors.size() + " descriptors computed");

                    log.info("Finished loading reference image");

                    log.info("Switching on camera");
                    mOpenCvCameraView.enableView();
                    log.info("Camera is on");

                } break;
                default: {
                    super.onManagerConnected(status);
                } break;
            }
        }
    };

    static {
        if (!OpenCVLoader.initDebug()) {
            // Handle initialization error
            log.error("Error initialising openCV library");
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_image_recognition);

        mOpenCvCameraView = (CameraBridgeViewBase) findViewById(R.id.HelloOpenCvView);
        mOpenCvCameraView.setVisibility(SurfaceView.VISIBLE);
        mOpenCvCameraView.setCvCameraViewListener(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        OpenCVLoader.initAsync(OpenCVLoader.OPENCV_VERSION_2_4_3, this, mLoaderCallback);
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.image_recognition, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();
        if (id == R.id.action_settings) {
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    public void onPause() {
        super.onPause();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mOpenCvCameraView != null)
            mOpenCvCameraView.disableView();
    }


    public void onCameraViewStarted(int width, int height) {
        log.info("OpenCV loaded successfully");
    }

    public void onCameraViewStopped() {

    }


    public Mat onCameraFrame(CameraBridgeViewBase.CvCameraViewFrame inputFrame) {

        if (referenceImage == null) {
            // not yet loaded it, or failed to load it
            return inputFrame.rgba();
        }

        Mat cameraImage = inputFrame.gray();

        if (referenceImage.empty() || cameraImage.empty() ) {
            log.warn("Error reading images. Ref image size is " + referenceImage.size() + ", Cam image size is " + cameraImage.size());
            return inputFrame.rgba();
        }

        // find keypoints
        log.debug("Finding keypoints...");
        MatOfKeyPoint cameraKeyPoints = new MatOfKeyPoint();
        featureDetector.detect(cameraImage, cameraKeyPoints);
        log.debug(cameraKeyPoints.size() + " features found");

        // find descriptors of keypoints
        log.debug("Calculating keypoint descriptors...");
        Mat cameraDescriptors = new Mat();
        featureExtractor.compute(cameraImage, cameraKeyPoints, cameraDescriptors);
        log.debug(cameraDescriptors.size() + " descriptors computed");

        // find matches between reference and camera descriptors
        log.debug("Matching descriptors. Ref type=" + referenceDescriptors.type() + ", size=" + referenceDescriptors.size() + ", Cam type=" + cameraDescriptors.type() + ", size=" + cameraDescriptors.size());
        if (referenceDescriptors.cols() != cameraDescriptors.cols()) {
            log.debug("Couldn't compute matches, probably no descriptors generated for camera image");
            return inputFrame.gray();
        }
        MatOfDMatch matches = new MatOfDMatch();
        matcher.match(cameraDescriptors, referenceDescriptors, matches);
        log.debug(matches.size() + " matches made");


        // Quick calculation of max and min distances between keypoints
        double minDist = 100;
        double maxDist = 0;
        List<DMatch> listofMatches = matches.toList();  // can probably do without this step if we get matrix indexing correct
        for(int i = 0; i < listofMatches.size(); i++) {
            final double dist = listofMatches.get(i).distance;
            if(dist < minDist) minDist = dist;
            if(dist > maxDist) maxDist = dist;
        }
        log.debug("Min dist: " + minDist);
        log.debug("Max dist: " + maxDist);

        // Find "good" matches (i.e. whose distance is less than 3*minDist)
        List<DMatch> goodMatches = new Vector<DMatch>();
        for(int i = 0; i < listofMatches.size(); i++) {
            if(listofMatches.get(i).distance < 1.2f*minDist) {
                goodMatches.add(listofMatches.get(i));
            }
        }

        // convert good matches to matrix
        MatOfDMatch goodMatchMatrix = new MatOfDMatch();
        goodMatchMatrix.fromList(goodMatches);
        log.info(goodMatchMatrix.size() + " good matches made");

        // Draw "good" matches onto image
        Mat finalImage = cameraImage.clone();
        //finalImage.reshape(inputFrame.gray().cols(), inputFrame.gray().rows());
        MatOfByte matchesMask = new MatOfByte();
        //Features2d.drawKeypoints(referenceImage, referenceKeyPoints, finalImage, new Scalar(0,0,255,255), Features2d.DRAW_RICH_KEYPOINTS);

        log.debug("Drawing matches...");
        Features2d.drawMatches(cameraImage, cameraKeyPoints, referenceImage, referenceKeyPoints,
                goodMatchMatrix, finalImage, new Scalar(0, 0, 255, 255), new Scalar(0, 0, 255, 255),  //BGRA
                matchesMask, Features2d.DRAW_RICH_KEYPOINTS);
        Imgproc.resize(finalImage, finalImage, cameraImage.size());
        log.debug("Returning final image with size " + finalImage.size());

//        for(int i = 0; i < goodMatches.size(); i++){
//            log.info("Good Match " + i + " -- Keypoint 1: " + goodMatches.get(i).queryIdx +
//                    ", Keypoint 2 " + goodMatches.get(i).trainIdx +
//                    ", dist = " + goodMatches.get(i).distance);
//        }


//
//        //-- Localize the object
//        std::vector<Point2f> obj;
//        std::vector<Point2f> scene;
//
//        for( int i = 0; i < good_matches.size(); i++ )
//        {
//            //-- Get the keypoints from the good matches
//            obj.push_back( keypoints_object[ good_matches[i].queryIdx ].pt );
//            scene.push_back( keypoints_scene[ good_matches[i].trainIdx ].pt );
//        }
//
//        Mat H = findHomography( obj, scene, CV_RANSAC );
//
//        //-- Get the corners from the image_1 ( the object to be "detected" )
//        std::vector<Point2f> obj_corners(4);
//        obj_corners[0] = cvPoint(0,0); obj_corners[1] = cvPoint( img_object.cols, 0 );
//        obj_corners[2] = cvPoint( img_object.cols, img_object.rows ); obj_corners[3] = cvPoint( 0, img_object.rows );
//        std::vector<Point2f> scene_corners(4);
//
//        perspectiveTransform( obj_corners, scene_corners, H);
//
//        //-- Draw lines between the corners (the mapped object in the scene - image_2 )
//        line( img_matches, scene_corners[0] + Point2f( img_object.cols, 0), scene_corners[1] + Point2f( img_object.cols, 0), Scalar(0, 255, 0), 4 );
//        line( img_matches, scene_corners[1] + Point2f( img_object.cols, 0), scene_corners[2] + Point2f( img_object.cols, 0), Scalar( 0, 255, 0), 4 );
//        line( img_matches, scene_corners[2] + Point2f( img_object.cols, 0), scene_corners[3] + Point2f( img_object.cols, 0), Scalar( 0, 255, 0), 4 );
//        line( img_matches, scene_corners[3] + Point2f( img_object.cols, 0), scene_corners[0] + Point2f( img_object.cols, 0), Scalar( 0, 255, 0), 4 );
//
//        //-- Show detected matches
//        imshow( "Good Matches & Object detection", img_matches );

        return finalImage;
    }
}
