package underad.blackbox.core.util;

import junit.framework.Test;
import junit.framework.TestCase;
import junit.framework.TestSuite;

public class CryptoTest extends TestCase {
    public CryptoTest(String testName) {
        super(testName);
    }

    public static Test suite() {
        return new TestSuite(CryptoTest.class);
    }

    public void testCryptoCycle() {
    	String pass = "oink_";
    	long ts = System.currentTimeMillis();
        String original = "zebra";
    	
    	String ciphertext = Crypto.encrypt(pass, ts, original);
        String plaintext = Crypto.decrypt(pass, ts, ciphertext);
        
        assertEquals(original, plaintext);
    }
    
    public void testEncrypt() {
    	String plaintext = "http://rp.glassinsight.co.uk/blackbox/reconstruct/3";
    	String ciphertext = Crypto.encrypt("ab3847dcef228a", 1410786753000L, plaintext);
    	
    	assertEquals("U2FsdGVkX19Sa2xZUlVRPcazqA9e27Uj99ymav/UjZiGCAyEy3bAAE4tFv4qsKZWBcC9/qLjpjZ8/CJgbwMWRT8EasYMGy/MRBuwEoPsY9E=", ciphertext);
    }
    
    public void testDecrypt() {
    	String ciphertext = "U2FsdGVkX19Sa2xZUlVRPcazqA9e27Uj99ymav/UjZiGCAyEy3bAAE4tFv4qsKZWBcC9/qLjpjZ8/CJgbwMWRT8EasYMGy/MRBuwEoPsY9E=";
    	String plaintext = Crypto.decrypt("ab3847dcef228a", 1410786753000L, ciphertext);
    	
    	assertEquals("http://rp.glassinsight.co.uk/blackbox/reconstruct/3", plaintext);
    }
}
