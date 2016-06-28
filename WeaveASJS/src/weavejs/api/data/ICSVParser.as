/* ***** BEGIN LICENSE BLOCK *****
 *
 * This file is part of Weave.
 *
 * The Initial Developer of Weave is the Institute for Visualization
 * and Perception Research at the University of Massachusetts Lowell.
 * Portions created by the Initial Developer are Copyright (C) 2008-2015
 * the Initial Developer. All Rights Reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * ***** END LICENSE BLOCK ***** */

package weavejs.api.data
{
	/**
	 * This is an interface for parsing and generating CSV data.
	 * 
	 * @author adufilie
	 */	
	public interface ICSVParser
	{
		/**
		 * This will parse a CSV String into a two-dimensional Array of String values.
		 * @param csvData The CSV String to parse.
		 * @return A 2-dimensional Array of Strings.
		 */
		function parseCSV(csvData:String):Array/*/<string[]>/*/;
		
		/**
		 * This will generate a CSV String from an Array of rows in a table.
		 * @param rows A two-dimensional Array, which will be accessed like rows[rowIndex][columnIndex].
		 * @return A CSV String containing the values from the rows.
		 */
		function createCSV(rows:Array):String;
		
		/**
		 * This function parses a String as a CSV-encoded row.
		 * @param csvData The CSV string to parse.
		 * @return The result of parsing the CSV string.
		 */
		function parseCSVRow(csvData:String):Array;
		
		/**
		 * This function encodes an Array of Strings into a single CSV-encoded String.
		 * @param row An array of values for a single row.
		 * @return The row encoded as a CSV String.
		 */
		function createCSVRow(row:Array):String;
		
		/**
		 * This function converts an Array of Arrays to an Array of Objects compatible with DataGrid.
		 * @param rows An Array of Arrays, the first being a header line containing property names.
		 * @param headerDepth The number of header rows.  If the depth is greater than one, nested record objects will be created.
		 * @return An Array of Objects containing String properties using the names in the header line.
		 */
		function convertRowsToRecords(rows:Array, headerDepth:int = 1):Array;
		
		/**
		 * This function returns a comprehensive list of all the field names defined by a list of record objects.
		 * @param records An Array of record objects.
		 * @param includeNullFields If this is true, fields that have null values will be included.
		 * @param headerDepth The depth of record properties.  If depth is greater than one, the records will be treated as nested objects.
		 * @return A comprehensive list of all the field names defined by the given record objects.  If headerDepth > 1, a two-dimensional array will be returned.
		 */
		function getRecordFieldNames(records:Array, includeNullFields:Boolean = false, headerDepth:int = 1):Array;
		
		/**
		 * This function converts an Array of Objects (compatible with DataGrid) to an Array of Arrays
		 * compatible with other functions in this class.
		 * @param records An Array of Objects containing String properties.
		 * @param columnOrder An optional list of column names to use in order.  Must be a two-dimensional Array if headerDepth > 1.
		 * @param allowBlankColumns If this is set to true, then the function will include all columns even if they are blank.
		 * @param headerDepth The depth of record properties.  If depth is greater than one, the records will be treated as nested objects.
		 * @return An Array of Arrays, the first being a header line containing all the property names.
		 */
		function convertRecordsToRows(records:Array, columnOrder:Array = null, allowBlankColumns:Boolean = false, headerDepth:int = 1):Array;
	}
}
