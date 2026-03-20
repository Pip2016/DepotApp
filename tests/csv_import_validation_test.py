import unittest

class TestCSVImportValidation(unittest.TestCase):

    def test_valid_csv(self):
        self.assertTrue(validate_csv('valid.csv'))

    def test_invalid_csv(self):
        self.assertFalse(validate_csv('invalid.csv'))

if __name__ == '__main__':
    unittest.main()